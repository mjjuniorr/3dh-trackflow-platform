package br.com.tresdhmanaus.trackflow.monitor.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.monitorDataStore by preferencesDataStore(name = "trackflow_monitor")

class MonitorPreferences(private val context: Context) {
    private val tokenKey = stringPreferencesKey("auth_token")
    private val hiddenIdsKey = stringSetPreferencesKey("hidden_delivery_person_ids")

    val token: Flow<String?> = context.monitorDataStore.data.map { it[tokenKey] }
    val hiddenIds: Flow<Set<String>> = context.monitorDataStore.data.map { it[hiddenIdsKey] ?: emptySet() }

    suspend fun saveToken(token: String) {
        context.monitorDataStore.edit { it[tokenKey] = token }
    }

    suspend fun clearToken() {
        context.monitorDataStore.edit { it.remove(tokenKey) }
    }

    suspend fun setVisible(personId: String, visible: Boolean) {
        context.monitorDataStore.edit { prefs ->
            val hidden = (prefs[hiddenIdsKey] ?: emptySet()).toMutableSet()
            if (visible) hidden.remove(personId) else hidden.add(personId)
            prefs[hiddenIdsKey] = hidden
        }
    }

    suspend fun showAll() {
        context.monitorDataStore.edit { it[hiddenIdsKey] = emptySet() }
    }

    suspend fun hideAll(ids: Set<String>) {
        context.monitorDataStore.edit { it[hiddenIdsKey] = ids }
    }
}
