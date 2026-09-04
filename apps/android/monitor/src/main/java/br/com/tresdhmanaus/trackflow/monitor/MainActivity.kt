package br.com.tresdhmanaus.trackflow.monitor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import br.com.tresdhmanaus.trackflow.monitor.data.DeliveryPerson
import br.com.tresdhmanaus.trackflow.monitor.data.NotificationItem
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

class MainActivity : ComponentActivity() {
    private val viewModel: MonitorViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContent {
            MonitorTheme {
                val state by viewModel.state.collectAsState()
                if (state.token == null) {
                    LoginScreen(
                        loading = state.loading,
                        error = state.error,
                        onLogin = viewModel::login
                    )
                } else {
                    MonitorScreen(
                        state = state,
                        onSetVisible = viewModel::setVisible,
                        onShowAll = viewModel::showAll,
                        onHideAll = viewModel::hideAll,
                        onMarkRead = viewModel::markRead,
                        onMarkAllRead = viewModel::markAllRead,
                        onLogout = viewModel::logout
                    )
                }
            }
        }
    }
}

@Composable
private fun MonitorTheme(content: @Composable () -> Unit) {
    MaterialTheme(content = content)
}

@Composable
private fun LoginScreen(loading: Boolean, error: String?, onLogin: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF111316)) {
        Column(
            modifier = Modifier.fillMaxSize().padding(28.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text("3DH", color = Color(0xFFF4672C), style = MaterialTheme.typography.headlineLarge)
            Text("TrackFlow Monitor", color = Color.White, style = MaterialTheme.typography.headlineMedium)
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("E-mail") },
                modifier = Modifier.fillMaxWidth().padding(top = 24.dp)
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Senha") },
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
            )
            Button(
                onClick = { onLogin(email, password) },
                enabled = !loading && email.isNotBlank() && password.isNotBlank(),
                modifier = Modifier.fillMaxWidth().padding(top = 18.dp)
            ) {
                Text(if (loading) "Entrando..." else "Entrar")
            }
            if (error != null) Text(error, color = Color(0xFFFF8A80), modifier = Modifier.padding(top = 12.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MonitorScreen(
    state: MonitorUiState,
    onSetVisible: (String, Boolean) -> Unit,
    onShowAll: () -> Unit,
    onHideAll: () -> Unit,
    onMarkRead: (String) -> Unit,
    onMarkAllRead: () -> Unit,
    onLogout: () -> Unit
) {
    var showVisibility by remember { mutableStateOf(false) }
    var showNotifications by remember { mutableStateOf(false) }
    val visible = state.people.filterNot { state.hiddenIds.contains(it.id) }

    Box(modifier = Modifier.fillMaxSize()) {
        TrackingMap(visible)

        Row(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 42.dp, end = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            FloatingControl("🔔", badge = state.unreadCount.takeIf { it > 0 }) {
                showNotifications = true
            }
            FloatingControl("⚙") {
                showVisibility = true
            }
        }
    }

    if (showVisibility) {
        ModalBottomSheet(onDismissRequest = { showVisibility = false }) {
            VisibilitySheet(
                people = state.people,
                hiddenIds = state.hiddenIds,
                onSetVisible = onSetVisible,
                onShowAll = onShowAll,
                onHideAll = onHideAll,
                onLogout = onLogout
            )
        }
    }

    if (showNotifications) {
        ModalBottomSheet(onDismissRequest = { showNotifications = false }) {
            NotificationSheet(
                notifications = state.notifications,
                onMarkRead = onMarkRead,
                onMarkAllRead = onMarkAllRead
            )
        }
    }
}

@Composable
private fun FloatingControl(label: String, badge: Int? = null, onClick: () -> Unit) {
    Box {
        Surface(
            onClick = onClick,
            shape = CircleShape,
            color = Color(0xE6111316),
            shadowElevation = 8.dp
        ) {
            Text(label, modifier = Modifier.padding(13.dp), style = MaterialTheme.typography.titleLarge)
        }
        if (badge != null) {
            Badge(modifier = Modifier.align(Alignment.TopEnd)) {
                Text(if (badge > 99) "99+" else badge.toString())
            }
        }
    }
}

@Composable
private fun TrackingMap(people: List<DeliveryPerson>) {
    val context = LocalContext.current
    val mapView = remember {
        Configuration.getInstance().userAgentValue = context.packageName
        MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(13.0)
            controller.setCenter(GeoPoint(-3.119, -60.0217))
        }
    }
    var initialFitDone by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        onDispose { mapView.onDetach() }
    }

    AndroidView(
        factory = { mapView },
        modifier = Modifier.fillMaxSize(),
        update = { map ->
            map.overlays.removeAll { it is Marker }
            people.forEach { person ->
                person.last_location?.let { location ->
                    Marker(map).apply {
                        position = GeoPoint(location.lat, location.lng)
                        title = person.name
                        snippet = person.computed_status + " • " + location.speed.toInt() + " km/h"
                        rotation = location.heading?.toFloat() ?: 0f
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                        map.overlays.add(this)
                    }
                }
            }
            if (!initialFitDone) {
                val points = people.mapNotNull { it.last_location }.map { GeoPoint(it.lat, it.lng) }
                if (points.isNotEmpty()) {
                    if (points.size == 1) {
                        map.controller.setZoom(15.0)
                        map.controller.setCenter(points.first())
                    } else {
                        val box = BoundingBox.fromGeoPoints(points)
                        map.zoomToBoundingBox(box, true, 80)
                    }
                    initialFitDone = true
                }
            }
            map.invalidate()
        }
    )
}

@Composable
private fun VisibilitySheet(
    people: List<DeliveryPerson>,
    hiddenIds: Set<String>,
    onSetVisible: (String, Boolean) -> Unit,
    onShowAll: () -> Unit,
    onHideAll: () -> Unit,
    onLogout: () -> Unit
) {
    Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
        Text("Objetos visiveis", style = MaterialTheme.typography.headlineSmall)
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onShowAll) { Text("Mostrar todos") }
            TextButton(onClick = onHideAll) { Text("Ocultar todos") }
        }
        LazyColumn {
            items(people, key = { it.id }) { person ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = !hiddenIds.contains(person.id),
                        onCheckedChange = { onSetVisible(person.id, it) }
                    )
                    Column {
                        Text(person.name)
                        Text(person.device_id, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp)) {
            Text("Sair")
        }
    }
}

@Composable
private fun NotificationSheet(
    notifications: List<NotificationItem>,
    onMarkRead: (String) -> Unit,
    onMarkAllRead: () -> Unit
) {
    Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Notificacoes", style = MaterialTheme.typography.headlineSmall)
            TextButton(onClick = onMarkAllRead) { Text("Marcar todas") }
        }
        LazyColumn {
            items(notifications, key = { it.id }) { notification ->
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
                    color = if (notification.is_read) Color.Transparent else Color(0x12F4672C),
                    onClick = { if (!notification.is_read) onMarkRead(notification.id) }
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(notification.title, style = MaterialTheme.typography.titleMedium)
                        Text(notification.message, style = MaterialTheme.typography.bodySmall)
                        Text(notification.created_at, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}
