package br.com.tresdhmanaus.trackflow.data

data class AppSettings(
    val deviceId: String = "",
    val deliveryName: String = "",
    val phone: String = "",
    val vehicleType: String = "motorcycle",
    val registered: Boolean = false
)
