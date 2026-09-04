package br.com.tresdhmanaus.trackflow.monitor

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import br.com.tresdhmanaus.trackflow.monitor.data.DeliveryPeopleResponse
import br.com.tresdhmanaus.trackflow.monitor.data.DebugMonitorSession
import br.com.tresdhmanaus.trackflow.monitor.data.DeliveryPerson
import br.com.tresdhmanaus.trackflow.monitor.data.MonitorPreferences
import br.com.tresdhmanaus.trackflow.monitor.data.NotificationItem
import br.com.tresdhmanaus.trackflow.monitor.network.MonitorApi
import br.com.tresdhmanaus.trackflow.monitor.realtime.MonitorSocket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

data class MonitorUiState(
    val token: String? = null,
    val people: List<DeliveryPerson> = emptyList(),
    val hiddenIds: Set<String> = emptySet(),
    val notifications: List<NotificationItem> = emptyList(),
    val unreadCount: Int = 0,
    val loading: Boolean = true,
    val error: String? = null,
    val realtimeConnected: Boolean = false
)

class MonitorViewModel(application: Application) : AndroidViewModel(application) {
    private val api = MonitorApi()
    private val preferences = MonitorPreferences(application)
    private val testSession = DebugMonitorSession(application)
    private val json = Json { ignoreUnknownKeys = true }
    private val _state = MutableStateFlow(MonitorUiState())
    val state: StateFlow<MonitorUiState> = _state
    private var socket: MonitorSocket? = null
    private var socketToken: String? = null
    private var sessionGeneration = 0
    private var locationRevision = 0L
    private var renewalJob: Job? = null

    init {
        viewModelScope.launch {
            if (testSession.available) {
                val generation = sessionGeneration
                try {
                    val token = withContext(Dispatchers.IO) { testSession.accessToken() }
                    if (generation == sessionGeneration && token != null) preferences.saveToken(token)
                } catch (error: Exception) {
                    if (error is kotlinx.coroutines.CancellationException) throw error
                    withContext(Dispatchers.IO) { testSession.clear() }
                    preferences.clearToken()
                    _state.value = _state.value.copy(error = "Sessao de teste indisponivel. Autorize novamente pelo computador.")
                }
            }
            combine(preferences.token, preferences.hiddenIds) { token, hidden -> token to hidden }
                .collectLatest { (token, hidden) ->
                    val generation = sessionGeneration
                    _state.value = _state.value.copy(token = token, hiddenIds = hidden, loading = false)
                    if (token != null && token != socketToken) {
                        socket?.disconnect()
                        socket = null
                        _state.value = _state.value.copy(realtimeConnected = false)
                        refreshAll(token)
                        if (generation == sessionGeneration && _state.value.token == token) connectSocket(token)
                    }
                }
        }
        // Silent devices produce no location events. Read authoritative status
        // periodically so their markers still transition through no-signal/offline.
        viewModelScope.launch {
            while (isActive) {
                delay(15_000)
                val token = _state.value.token ?: continue
                val generation = sessionGeneration
                val revision = locationRevision
                try {
                    val response = withContext(Dispatchers.IO) { api.deliveryPeople(token) }
                    if (generation == sessionGeneration && token == _state.value.token && revision == locationRevision) {
                        _state.value = _state.value.copy(people = response.delivery_people)
                        if (BuildConfig.DEBUG) Log.d("TrackFlowMonitor", "Status refresh: ${response.delivery_people.groupingBy { it.computed_status }.eachCount()}")
                    }
                } catch (error: Exception) {
                    if (error is kotlinx.coroutines.CancellationException) throw error
                    if (BuildConfig.DEBUG) Log.w("TrackFlowMonitor", "Status refresh failed: ${error.javaClass.simpleName}")
                }
            }
        }
        if (testSession.available) {
            renewalJob = viewModelScope.launch {
                while (isActive && testSession.available) {
                    delay(20_000)
                    val generation = sessionGeneration
                    try {
                        val token = withContext(Dispatchers.IO) { testSession.accessToken() }
                        if (generation == sessionGeneration && token != null && token != _state.value.token) preferences.saveToken(token)
                    } catch (error: Exception) {
                        if (error is kotlinx.coroutines.CancellationException) throw error
                        sessionGeneration++
                        socket?.disconnect()
                        socket = null
                        socketToken = null
                        withContext(Dispatchers.IO) { testSession.clear() }
                        preferences.clearToken()
                        _state.value = _state.value.copy(error = "Sessao de teste indisponivel. Autorize novamente pelo computador.")
                        break
                    }
                }
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            runCatching {
                withContext(Dispatchers.IO) { api.login(email, password).token }
            }.onSuccess { token ->
                preferences.saveToken(token)
                _state.value = _state.value.copy(loading = false)
            }.onFailure {
                if (BuildConfig.DEBUG) {
                    val status = it.message?.takeIf { message -> message.matches(Regex("HTTP [0-9]{3}")) }
                    Log.w("TrackFlowMonitor", "Login failure: ${it.javaClass.simpleName} ${status.orEmpty()}")
                }
                _state.value = _state.value.copy(loading = false, error = "Falha no login.")
            }
        }
    }

    fun logout() {
        sessionGeneration++
        val generation = sessionGeneration
        renewalJob?.cancel()
        socket?.disconnect()
        socket = null
        socketToken = null
        _state.value = MonitorUiState(loading = true)
        viewModelScope.launch {
            withContext(Dispatchers.IO) { testSession.clear() }
            preferences.clearToken()
            if (generation == sessionGeneration) _state.value = MonitorUiState(loading = false)
        }
    }

    fun setVisible(id: String, visible: Boolean) {
        viewModelScope.launch { preferences.setVisible(id, visible) }
    }

    fun showAll() {
        viewModelScope.launch { preferences.showAll() }
    }

    fun hideAll() {
        viewModelScope.launch { preferences.hideAll(_state.value.people.map { it.id }.toSet()) }
    }

    fun markRead(id: String) {
        val token = _state.value.token ?: return
        viewModelScope.launch {
            runCatching { withContext(Dispatchers.IO) { api.markRead(token, id) } }
            refreshNotifications(token)
        }
    }

    fun markAllRead() {
        val token = _state.value.token ?: return
        viewModelScope.launch {
            runCatching { withContext(Dispatchers.IO) { api.markAllRead(token) } }
            refreshNotifications(token)
        }
    }

    private fun connectSocket(token: String) {
        val generation = sessionGeneration
        socket?.disconnect()
        socketToken = token
        socket = MonitorSocket(
            token = token,
            onLocationUpdate = { raw ->
                viewModelScope.launch {
                    if (generation != sessionGeneration || _state.value.token != token) return@launch
                    runCatching {
                        json.decodeFromString<DeliveryPeopleResponse>(raw)
                    }.onSuccess { response ->
                        locationRevision++
                        _state.value = _state.value.copy(people = response.delivery_people, realtimeConnected = true)
                        if (BuildConfig.DEBUG) Log.d("TrackFlowMonitor", "Realtime status: ${response.delivery_people.groupingBy { it.computed_status }.eachCount()}")
                    }
                }
            },
            onNotification = {
                viewModelScope.launch { refreshNotifications(token) }
            },
            onUnreadCount = { count ->
                _state.value = _state.value.copy(unreadCount = count)
            },
            onAuthError = {
                viewModelScope.launch { if (_state.value.token == token) logout() }
            },
            onDisconnected = {
                viewModelScope.launch {
                    if (generation == sessionGeneration && socketToken == token) _state.value = _state.value.copy(realtimeConnected = false)
                }
            }
        ).also { it.connect() }
    }

    private suspend fun refreshAll(token: String) {
        _state.value = _state.value.copy(loading = true, error = null)
        runCatching {
            withContext(Dispatchers.IO) {
                api.deliveryPeople(token)
            }
        }.onSuccess { people ->
            if (_state.value.token != token) return@onSuccess
            _state.value = _state.value.copy(
                people = people.delivery_people,
                loading = false
            )
        }.onFailure {
            if (it is kotlinx.coroutines.CancellationException) throw it
            _state.value = _state.value.copy(loading = false, error = "Nao foi possivel carregar o monitor.")
        }
        refreshNotifications(token)
    }

    private suspend fun refreshNotifications(token: String) {
        runCatching {
            withContext(Dispatchers.IO) {
                api.notifications(token) to api.unreadCount(token)
            }
        }.onSuccess { (notifications, count) ->
            if (_state.value.token != token) return@onSuccess
            _state.value = _state.value.copy(
                notifications = notifications.notifications,
                unreadCount = count.unread_count
            )
        }.onFailure {
            if (it is kotlinx.coroutines.CancellationException) throw it
            _state.value = _state.value.copy(error = "Central de notificacoes indisponivel no servidor.")
        }
    }

    override fun onCleared() {
        socket?.disconnect()
        super.onCleared()
    }
}
