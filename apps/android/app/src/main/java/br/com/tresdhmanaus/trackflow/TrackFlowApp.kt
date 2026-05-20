package br.com.tresdhmanaus.trackflow

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import br.com.tresdhmanaus.trackflow.tracking.TrackingService

class TrackFlowApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                TrackingService.CHANNEL_ID,
                "Rastreamento 3DH",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
