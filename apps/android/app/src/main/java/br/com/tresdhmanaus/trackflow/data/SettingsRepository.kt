package br.com.tresdhmanaus.trackflow.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import java.util.UUID
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("trackflow_settings")

class SettingsRepository(private val context: Context) {
    val settings: Flow<AppSettings> = context.dataStore.data.map { prefs ->
        AppSettings(
            deviceId = prefs[DEVICE_ID].orEmpty(),
            deliveryName = prefs[DELIVERY_NAME].orEmpty(),
            phone = prefs[PHONE].orEmpty(),
            registered = prefs[REGISTERED] ?: false
        )
    }

    suspend fun ensureDeviceId(): String {
        var current = ""
        context.dataStore.edit { prefs ->
            current = prefs[DEVICE_ID] ?: "android-${UUID.randomUUID()}"
            prefs[DEVICE_ID] = current
        }
        return current
    }

    suspend fun saveRegistration(name: String, phone: String, deviceId: String) {
        context.dataStore.edit { prefs ->
            prefs[DELIVERY_NAME] = name
            prefs[PHONE] = phone
            prefs[DEVICE_ID] = deviceId
            prefs[REGISTERED] = true
        }
    }

    companion object {
        private val DEVICE_ID = stringPreferencesKey("device_id")
        private val DELIVERY_NAME = stringPreferencesKey("delivery_name")
        private val PHONE = stringPreferencesKey("phone")
        private val REGISTERED = booleanPreferencesKey("registered")
    }
}
