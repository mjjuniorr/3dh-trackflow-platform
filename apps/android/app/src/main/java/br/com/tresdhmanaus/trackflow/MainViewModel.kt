package br.com.tresdhmanaus.trackflow

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import br.com.tresdhmanaus.trackflow.data.AppSettings
import br.com.tresdhmanaus.trackflow.data.SettingsRepository
import br.com.tresdhmanaus.trackflow.network.RegisterDeliveryPersonRequest
import br.com.tresdhmanaus.trackflow.network.TrackFlowApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val settingsRepository = SettingsRepository(application)
    private val api = TrackFlowApi()

    val settings: StateFlow<AppSettings> = settingsRepository.settings.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = AppSettings()
    )

    init {
        viewModelScope.launch {
            settingsRepository.ensureDeviceId()
        }
    }

    fun register(name: String, phone: String, onResult: (Result<Unit>) -> Unit) {
        viewModelScope.launch {
            val result = runCatching {
                val deviceId = settingsRepository.ensureDeviceId()
                withContext(Dispatchers.IO) {
                    api.registerDeliveryPerson(
                        RegisterDeliveryPersonRequest(
                            name = name.trim(),
                            phone = phone.trim().ifBlank { null },
                            device_id = deviceId
                        )
                    )
                }
                settingsRepository.saveRegistration(name.trim(), phone.trim(), deviceId)
            }
            onResult(result)
        }
    }
}
