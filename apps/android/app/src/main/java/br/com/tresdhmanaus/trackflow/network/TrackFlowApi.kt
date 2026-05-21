package br.com.tresdhmanaus.trackflow.network

import br.com.tresdhmanaus.trackflow.BuildConfig
import java.io.IOException
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

private val JsonFormat = Json { ignoreUnknownKeys = true }

class TrackFlowApi(
    private val client: OkHttpClient = OkHttpClient(),
    private val json: Json = JsonFormat
) {
    private val mediaType = "application/json; charset=utf-8".toMediaType()

    fun registerDeliveryPerson(request: RegisterDeliveryPersonRequest) {
        post("/api/mobile/delivery-people/register", json.encodeToString(request))
    }

    fun sendTelemetry(request: TelemetryRequest) {
        post("/api/mobile/telemetry", json.encodeToString(request))
    }

    private fun post(path: String, body: String) {
        val httpRequest = Request.Builder()
            .url("${BuildConfig.TRACKFLOW_API_BASE_URL}$path")
            .header("Content-Type", "application/json")
            .header("X-Mobile-Registration-Secret", BuildConfig.MOBILE_REGISTRATION_SECRET)
            .post(body.toRequestBody(mediaType))
            .build()

        client.newCall(httpRequest).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("Falha HTTP ${response.code}: ${response.body?.string().orEmpty()}")
            }
        }
    }
}

@Serializable
data class RegisterDeliveryPersonRequest(
    val name: String,
    val device_id: String,
    val vehicle_type: String = "motorcycle",
    val phone: String? = null
)

@Serializable
data class TelemetryRequest(
    val device_id: String,
    val lat: Double,
    val lng: Double,
    val speed: Double,
    val heading: Double? = null,
    val battery: Int? = null,
    val accuracy: Double? = null,
    val timestamp: String
)
