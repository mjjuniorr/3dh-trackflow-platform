package br.com.tresdhmanaus.trackflow.monitor.data

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class LoginResponse(val token: String)

@Serializable
data class LocationEvent(
    val lat: Double,
    val lng: Double,
    val speed: Double = 0.0,
    val heading: Double? = null,
    val battery: Int? = null,
    val accuracy: Double? = null,
    val timestamp: String
)

@Serializable
data class DeliveryPerson(
    val id: String,
    val name: String,
    val device_id: String,
    val vehicle_type: String = "motorcycle",
    val computed_status: String = "offline",
    val last_location: LocationEvent? = null
)

@Serializable
data class DeliveryPeopleResponse(val delivery_people: List<DeliveryPerson> = emptyList())

@Serializable
data class NotificationItem(
    val id: String,
    val type: String,
    val device_id: String,
    val title: String,
    val message: String,
    val severity: String = "info",
    val created_at: String,
    val resolved_at: String? = null,
    val is_read: Boolean = false,
    val read_at: String? = null
)

@Serializable
data class NotificationsResponse(val notifications: List<NotificationItem> = emptyList())

@Serializable
data class UnreadCountResponse(val unread_count: Int = 0)
