package br.com.tresdhmanaus.trackflow.monitor.network

import br.com.tresdhmanaus.trackflow.monitor.BuildConfig
import br.com.tresdhmanaus.trackflow.monitor.data.DeliveryPeopleResponse
import br.com.tresdhmanaus.trackflow.monitor.data.LoginRequest
import br.com.tresdhmanaus.trackflow.monitor.data.LoginResponse
import br.com.tresdhmanaus.trackflow.monitor.data.NotificationsResponse
import br.com.tresdhmanaus.trackflow.monitor.data.UnreadCountResponse
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class MonitorApi {
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }
    private val mediaType = "application/json".toMediaType()

    fun login(email: String, password: String): LoginResponse =
        post("/api/auth/login", json.encodeToString(LoginRequest(email.trim(), password)), null)

    fun deliveryPeople(token: String): DeliveryPeopleResponse =
        get("/api/delivery-people", token)

    fun notifications(token: String): NotificationsResponse =
        get("/api/notifications", token)

    fun unreadCount(token: String): UnreadCountResponse =
        get("/api/notifications/unread-count", token)

    fun markRead(token: String, id: String): UnreadCountResponse =
        post("/api/notifications/" + id + "/read", "{}", token)

    fun markAllRead(token: String): UnreadCountResponse =
        post("/api/notifications/read-all", "{}", token)

    private inline fun <reified T> get(path: String, token: String?): T {
        val builder = Request.Builder().url(BuildConfig.TRACKFLOW_API_BASE_URL + path)
        if (token != null) builder.header("Authorization", "Bearer " + token)
        client.newCall(builder.get().build()).execute().use { response ->
            if (!response.isSuccessful) error("HTTP " + response.code)
            return json.decodeFromString(response.body?.string().orEmpty())
        }
    }

    private inline fun <reified T> post(path: String, body: String, token: String?): T {
        val builder = Request.Builder()
            .url(BuildConfig.TRACKFLOW_API_BASE_URL + path)
            .post(body.toRequestBody(mediaType))
        if (token != null) builder.header("Authorization", "Bearer " + token)
        client.newCall(builder.build()).execute().use { response ->
            if (!response.isSuccessful) error("HTTP " + response.code)
            return json.decodeFromString(response.body?.string().orEmpty())
        }
    }
}
