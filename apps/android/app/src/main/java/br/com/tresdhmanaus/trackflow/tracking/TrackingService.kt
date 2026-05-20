package br.com.tresdhmanaus.trackflow.tracking

import android.Manifest
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.IBinder
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import br.com.tresdhmanaus.trackflow.MainActivity
import br.com.tresdhmanaus.trackflow.R
import br.com.tresdhmanaus.trackflow.data.AppSettings
import br.com.tresdhmanaus.trackflow.data.SettingsRepository
import br.com.tresdhmanaus.trackflow.network.TelemetryRequest
import br.com.tresdhmanaus.trackflow.network.TrackFlowApi
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.time.OffsetDateTime
import java.time.ZoneOffset
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class TrackingService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var settingsRepository: SettingsRepository
    private val api = TrackFlowApi()
    private var locationJob: Job? = null
    private var lastHeading: Float? = null

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        settingsRepository = SettingsRepository(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification("Rastreamento ativo"))
        startLocationUpdates()
        return START_STICKY
    }

    override fun onDestroy() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
        locationJob?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            stopSelf()
            return
        }

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, LOCATION_INTERVAL_MS)
            .setMinUpdateIntervalMillis(LOCATION_INTERVAL_MS)
            .setWaitForAccurateLocation(false)
            .build()

        fusedLocationClient.requestLocationUpdates(request, locationCallback, mainLooper)
    }

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val location = result.lastLocation ?: return
            locationJob = scope.launch {
                val settings = settingsRepository.settings.first()
                if (!settings.registered || settings.deviceId.isBlank()) return@launch

                val speedKmh = location.speed * 3.6
                val heading = when {
                    location.hasBearing() && speedKmh > 5 -> location.bearing.also { lastHeading = it }
                    lastHeading != null -> lastHeading
                    else -> null
                }

                api.sendTelemetry(
                    TelemetryRequest(
                        device_id = settings.deviceId,
                        lat = location.latitude,
                        lng = location.longitude,
                        speed = speedKmh,
                        heading = heading?.toDouble(),
                        battery = batteryPercent(),
                        accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
                        timestamp = OffsetDateTime.now(ZoneOffset.UTC).toString()
                    )
                )
            }
        }
    }

    private fun batteryPercent(): Int? {
        val manager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val value = manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return value.takeIf { it >= 0 }
    }

    private fun buildNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("3DH TrackFlow")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        const val CHANNEL_ID = "trackflow_tracking"
        private const val NOTIFICATION_ID = 3001
        private const val LOCATION_INTERVAL_MS = 5_000L
    }
}
