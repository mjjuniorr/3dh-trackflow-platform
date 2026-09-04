package br.com.tresdhmanaus.trackflow.monitor.realtime

import br.com.tresdhmanaus.trackflow.monitor.BuildConfig
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject

class MonitorSocket(
    private val token: String,
    private val onLocationUpdate: (String) -> Unit,
    private val onNotification: () -> Unit,
    private val onUnreadCount: (Int) -> Unit,
    private val onAuthError: () -> Unit,
    private val onDisconnected: () -> Unit
) {
    private val socket: Socket = IO.socket(
        BuildConfig.TRACKFLOW_API_BASE_URL,
        IO.Options().apply { transports = arrayOf("websocket") }
    )

    fun connect() {
        socket.on(Socket.EVENT_DISCONNECT) { onDisconnected() }
        socket.on(Socket.EVENT_CONNECT_ERROR) { onDisconnected() }
        socket.on(Socket.EVENT_CONNECT) {
            socket.emit("dashboard:join", JSONObject().put("token", token))
        }
        socket.on("location:update") { args ->
            args.firstOrNull()?.let { onLocationUpdate(it.toString()) }
        }
        socket.on("notification:new") {
            onNotification()
        }
        socket.on("notification:count") { args ->
            val count = (args.firstOrNull() as? JSONObject)?.optInt("unread_count", 0) ?: 0
            onUnreadCount(count)
        }
        socket.on("auth:error") {
            onAuthError()
        }
        socket.connect()
    }

    fun disconnect() {
        socket.off()
        socket.disconnect()
    }
}
