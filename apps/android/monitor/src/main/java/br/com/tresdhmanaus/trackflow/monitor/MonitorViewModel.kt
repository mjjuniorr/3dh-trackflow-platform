package br.com.tresdhmanaus.trackflow.monitor

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import br.com.tresdhmanaus.trackflow.monitor.data.DeliveryPeopleResponse
import br.com.tresdhmanaus.trackflow.monitor.data.DeliveryPerson
import br.com.tresdhmanaus.trackflow.monitor.data.MonitorPreferences
import br.com.tresdhmanaus.trackflow.monitor.data.NotificationItem
import br.com.tresdhmanaus.trackflow.monitor.network.MonitorApi
import br.com.tresdhmanaus.trackflow.monitor.realtime.MonitorSocket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

data class MonitorUiState(
    val token: String? = null,
    val people: List<DeliveryPerson> = emptyList(),
    val hiddenIds: Set<String> = emptySet(),
    val notifications: List<NotificationItem> = emptyList(),
    val unreadCount: Int = 0,
    val loading: Boolean = true,
    val error: String? = null
)

class MonitorViewModel(application: Application) : AndroidViewModel(application) {
    private val api = MonitorApi()
    private val preferences = MonitorPreferences(application)
    private val json = Json { ignoreUnknownKeys = true }
    private val _state = MutableStateFlow(MonitorUiState())
    val state: StateFlow<MonitorUiState> = _state
    private var socket: MonitorSocket? = null

    init {
        viewModelScope.launch {
            combine(preferences.token, preferences.hiddenIds) { token, hidden -> token to hidden }
                .collect { (token, hidden) ->
                    _state.value = _state.value.copy(token = token, hiddenIds = hidden, loading = false)
                    if (token != null && socket == null) {
                        refreshAll(token)
                        connectSocket(token)
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
                _state.value = _state.value.copy(loading = false, error = "Falha no login.")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            socket?.disconnect()
            socket = null
            preferences.clearToken()
            _state.value = MonitorUiState(loading = false)
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
        socket?.disconnect()
        socket = MonitorSocket(
            token = token,
            onLocationUpdate = { raw ->
                viewModelScope.launch {
                    runCatching {
                        json.decodeFromString<DeliveryPeopleResponse>(raw)
                    }.onSuccess { response ->
                        _state.value = _state.value.copy(people = response.delivery_people)
                    }
                }
            },
            onNotification = {
                viewModelScope.launch { refreshNotifications(token) }
            },
            onUnreadCount = { count ->
                _state.value = _state.value.copy(unreadCount = count)
            },
            onAuthError = { logout() }
        ).also { it.connect() }
    }

    private suspend fun refreshAll(token: String) {
        _state.value = _state.value.copy(loading = true, error = null)
        runCatching {
            withContext(Dispatchers.IO) {
                Triple(api.deliveryPeople(token), api.notifications(token), api.unreadCount(token))
            }
        }.onSuccess { (people, notifications, count) ->
            _state.value = _state.value.copy(
                people = people.delivery_people,
                notifications = notifications.notifications,
                unreadCount = count.unread_count,
                loading = false
            )
        }.onFailure {
            _state.value = _state.value.copy(loading = false, error = "Nao foi possivel carregar o monitor.")
        }
    }

    private suspend fun refreshNotifications(token: String) {
        runCatching {
            withContext(Dispatchers.IO) {
                api.notifications(token) to api.unreadCount(token)
            }
        }.onSuccess { (notifications, count) ->
            _state.value = _state.value.copy(
                notifications = notifications.notifications,
                unreadCount = count.unread_count
            )
        }
    }

    override fun onCleared() {
        socket?.disconnect()
        super.onCleared()
    }
}
