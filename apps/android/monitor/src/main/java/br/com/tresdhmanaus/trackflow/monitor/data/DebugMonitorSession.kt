package br.com.tresdhmanaus.trackflow.monitor.data

import android.content.Context
import android.util.AtomicFile
import br.com.tresdhmanaus.trackflow.monitor.BuildConfig
import java.io.File
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request

/** An operator provisions this private, expiring session over USB in debug builds only. */
class DebugMonitorSession(context: Context) {
    private val file = AtomicFile(File(context.noBackupFilesDir, "monitor-test-session.json"))
    private val json = Json { ignoreUnknownKeys = true }
    private val client = OkHttpClient()

    val available: Boolean get() = BuildConfig.DEBUG && file.baseFile.exists()

    @Synchronized
    fun accessToken(): String? {
        if (!available) return null
        val session = json.decodeFromString<Session>(file.readFully().decodeToString())
        val now = System.currentTimeMillis() / 1000
        check(now < session.test_until) { "Sessao de teste encerrada. Autorize novamente pelo computador." }
        if (session.expires_at > now + 60) return session.access_token

        val body = FormBody.Builder()
            .add("grant_type", "refresh_token")
            .add("client_id", "trackflow-web")
            .add("refresh_token", session.refresh_token)
            .build()
        val request = Request.Builder()
            .url("https://auth.3dhmanaus.com.br/realms/3dh/protocol/openid-connect/token")
            .post(body).build()
        client.newCall(request).execute().use { response ->
            check(response.isSuccessful) { "Nao foi possivel renovar a sessao de teste." }
            val renewed = json.decodeFromString<TokenResponse>(response.body?.string().orEmpty())
            check(renewed.access_token.isNotBlank() && renewed.expires_in > 0)
            val updated = session.copy(
                access_token = renewed.access_token,
                refresh_token = renewed.refresh_token ?: session.refresh_token,
                expires_at = System.currentTimeMillis() / 1000 + renewed.expires_in
            )
            val stream = file.startWrite()
            try {
                stream.write(json.encodeToString(updated).encodeToByteArray())
                file.finishWrite(stream)
            } catch (error: Exception) {
                file.failWrite(stream)
                throw error
            }
            return updated.access_token
        }
    }

    @Synchronized
    fun clear() {
        if (BuildConfig.DEBUG) file.delete()
    }

    @Serializable
    private data class Session(
        val access_token: String,
        val refresh_token: String,
        val expires_at: Long,
        val test_until: Long
    )

    @Serializable
    private data class TokenResponse(
        val access_token: String,
        val refresh_token: String? = null,
        val expires_in: Long
    )
}
