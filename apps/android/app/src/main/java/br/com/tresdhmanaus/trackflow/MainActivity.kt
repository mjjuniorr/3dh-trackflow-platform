package br.com.tresdhmanaus.trackflow

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import br.com.tresdhmanaus.trackflow.tracking.TrackingService
import br.com.tresdhmanaus.trackflow.ui.TrackFlowTheme
import kotlin.math.roundToInt

private val Ink = Color(0xFF090D13)
private val Panel = Color(0xFF121820)
private val PanelSoft = Color(0xFF18212C)
private val Line = Color(0xFF2B3542)
private val Muted = Color(0xFFA8B0BC)
private val Orange = Color(0xFFF4672C)
private val Green = Color(0xFF57E35B)
private val Blue = Color(0xFF2F87FF)

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TrackFlowTheme {
                val settings by viewModel.settings.collectAsState()
                var tracking by remember { mutableStateOf(false) }
                TrackFlowScreen(
                    registered = settings.registered,
                    deviceId = settings.deviceId,
                    deliveryName = settings.deliveryName,
                    tracking = tracking,
                    onRegister = viewModel::register,
                    onStartTracking = {
                        tracking = true
                        startTrackingService()
                    },
                    onStopTracking = {
                        tracking = false
                        stopService(Intent(this, TrackingService::class.java))
                    }
                )
            }
        }
    }

    private fun startTrackingService() {
        val intent = Intent(this, TrackingService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }
}

@Composable
private fun TrackFlowScreen(
    registered: Boolean,
    deviceId: String,
    deliveryName: String,
    tracking: Boolean,
    onRegister: (String, String, (Result<Unit>) -> Unit) -> Unit,
    onStartTracking: () -> Unit,
    onStopTracking: () -> Unit
) {
    val focusManager = LocalFocusManager.current
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        onStartTracking()
    }

    Surface(modifier = Modifier.fillMaxSize(), color = Ink) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF111824), Ink, Color(0xFF070A0F))
                    )
                )
        ) {
            if (registered) {
                TrackingHome(
                    name = deliveryName,
                    deviceId = deviceId,
                    tracking = tracking,
                    onStart = {
                        val permissions = buildList {
                            add(Manifest.permission.ACCESS_FINE_LOCATION)
                            add(Manifest.permission.ACCESS_COARSE_LOCATION)
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                add(Manifest.permission.POST_NOTIFICATIONS)
                            }
                        }
                        permissionLauncher.launch(permissions.toTypedArray())
                    },
                    onStop = onStopTracking
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .clickable(
                            indication = null,
                            interactionSource = remember { MutableInteractionSource() }
                        ) { focusManager.clearFocus() }
                        .verticalScroll(rememberScrollState())
                        .imePadding()
                        .padding(22.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    RegistrationHero()
                    RegisterForm(deviceId = deviceId, onRegister = onRegister)
                    HelpLine()
                }
            }
        }
    }
}

@Composable
private fun RegistrationHero() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(250.dp)
            .clip(RoundedCornerShape(28.dp))
            .background(Brush.verticalGradient(listOf(Color(0xFF182233), Color(0xFF0B1018))))
            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(28.dp))
    ) {
        CityRouteArt(modifier = Modifier.fillMaxSize())
        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 34.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text("3", color = Color.White, style = MaterialTheme.typography.displayMedium, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic)
                Text("D", color = Orange, style = MaterialTheme.typography.displayMedium, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic)
                Text("H", color = Color.White, style = MaterialTheme.typography.displayMedium, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic)
            }
            Text("TRACKFLOW", color = Orange, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
            Text("RASTREAMENTO INTELIGENTE", color = Color.White.copy(alpha = 0.74f), style = MaterialTheme.typography.labelMedium)
        }
        Text(
            "●",
            color = Orange,
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 22.dp, top = 70.dp),
            style = MaterialTheme.typography.headlineSmall
        )
    }
}

@Composable
private fun CityRouteArt(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        for (i in 0..9) {
            val y = h * (0.56f + i * 0.045f)
            drawLine(Color.White.copy(alpha = 0.035f), Offset(0f, y), Offset(w, y + (i % 3) * 18f), strokeWidth = 2f)
        }
        val path = Path().apply {
            moveTo(w * 0.12f, h * 0.67f)
            cubicTo(w * 0.26f, h * 0.54f, w * 0.34f, h * 0.88f, w * 0.50f, h * 0.70f)
            cubicTo(w * 0.64f, h * 0.54f, w * 0.72f, h * 0.71f, w * 0.90f, h * 0.56f)
        }
        drawPath(path, Orange.copy(alpha = 0.95f), style = Stroke(width = 4f, cap = StrokeCap.Round))
        drawCircle(Orange.copy(alpha = 0.18f), radius = h * 0.18f, center = Offset(w * 0.76f, h * 0.70f))
        drawCircle(Color.Black.copy(alpha = 0.45f), radius = h * 0.11f, center = Offset(w * 0.79f, h * 0.68f))
        drawLine(Color.Black.copy(alpha = 0.9f), Offset(w * 0.76f, h * 0.58f), Offset(w * 0.88f, h * 0.75f), strokeWidth = 12f, cap = StrokeCap.Round)
    }
}

@Composable
private fun RegisterForm(deviceId: String, onRegister: (String, String, (Result<Unit>) -> Unit) -> Unit) {
    val focusManager = LocalFocusManager.current
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Cadastro do entregador", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("Informe seus dados para iniciar o rastreamento.", color = Muted, style = MaterialTheme.typography.bodyMedium)

        PremiumField(
            label = "Nome do entregador",
            value = name,
            leading = "♙",
            placeholder = "Maria Silva",
            imeAction = ImeAction.Next,
            onValueChange = { name = it }
        )
        PremiumField(
            label = "Telefone",
            value = phone,
            leading = "☎",
            placeholder = "(92) 99999-9999",
            imeAction = ImeAction.Done,
            keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
            onValueChange = { phone = it }
        )
        DeviceCard(deviceId = deviceId)
        SecureCard()
        Button(
            onClick = {
                focusManager.clearFocus()
                onRegister(name, phone) { result ->
                    message = result.fold(
                        onSuccess = { "Cadastro concluido." },
                        onFailure = { it.message ?: "Falha no cadastro." }
                    )
                }
            },
            enabled = name.trim().length >= 2,
            colors = ButtonDefaults.buttonColors(containerColor = Orange, disabledContainerColor = Orange.copy(alpha = 0.35f)),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp)
        ) {
            Text("▶  Cadastrar e iniciar", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }
        if (message.isNotBlank()) Text(message, color = Muted)
    }
}

@Composable
private fun PremiumField(
    label: String,
    value: String,
    leading: String,
    placeholder: String,
    imeAction: ImeAction,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    onValueChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(9.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(leading, color = Color.White.copy(alpha = 0.75f))
            Text(label, color = Color.White.copy(alpha = 0.86f), style = MaterialTheme.typography.bodyMedium)
        }
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder, color = Muted.copy(alpha = 0.65f)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = imeAction),
            keyboardActions = keyboardActions,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Orange,
                unfocusedBorderColor = Line,
                focusedContainerColor = Panel,
                unfocusedContainerColor = Panel,
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                cursorColor = Orange
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun DeviceCard(deviceId: String) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(9.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("▯", color = Color.White.copy(alpha = 0.75f))
            Text("Device ID", color = Color.White.copy(alpha = 0.86f))
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(Panel)
                .border(1.dp, Line, RoundedCornerShape(14.dp))
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(deviceId.ifBlank { "gerando..." }, color = Color.White, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                "Gerado automaticamente",
                color = Orange,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier
                    .border(1.dp, Orange, RoundedCornerShape(12.dp))
                    .padding(horizontal = 8.dp, vertical = 5.dp)
            )
        }
    }
}

@Composable
private fun SecureCard() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFF101720))
            .border(1.dp, Line, RoundedCornerShape(18.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("♢", color = Orange, style = MaterialTheme.typography.headlineSmall)
        Column(modifier = Modifier.weight(1f)) {
            Text("Conexao segura com o servidor", color = Color.White, fontWeight = FontWeight.SemiBold)
            Text("Seus dados e sua localizacao estao protegidos.", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
        Text("▣", color = Green, style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
private fun HelpLine() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("?  Precisa de ajuda? ", color = Muted)
        Text("Fale com o suporte", color = Orange, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun TrackingHome(name: String, deviceId: String, tracking: Boolean, onStart: () -> Unit, onStop: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(0.dp)
    ) {
        TrackingTopBar()
        MapPanel(tracking = tracking)
        TelemetryPanel(name = name, deviceId = deviceId, tracking = tracking, onStart = onStart, onStop = onStop)
        BottomNav()
    }
}

@Composable
private fun TrackingTopBar() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("☰", color = Color.White, style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.weight(1f))
        Row(verticalAlignment = Alignment.Bottom) {
            Text("3D", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic)
            Text("H", color = Orange, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic)
            Text(" TRACKFLOW", color = Orange, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
        }
        Spacer(Modifier.weight(1f))
        Text("♢", color = Color.White, style = MaterialTheme.typography.headlineSmall)
    }
}

@Composable
private fun MapPanel(tracking: Boolean) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1.16f)
            .background(Color(0xFF101928))
    ) {
        DarkMapArt(modifier = Modifier.fillMaxSize())
        Row(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(16.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(Color.Black.copy(alpha = 0.35f))
                .border(1.dp, Color.White.copy(alpha = 0.18f), RoundedCornerShape(18.dp))
                .padding(horizontal = 14.dp, vertical = 9.dp),
            horizontalArrangement = Arrangement.spacedBy(9.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.size(12.dp).clip(CircleShape).background(if (tracking) Green else Muted))
            Text(if (tracking) "Rastreando ativo" else "Rastreamento parado", color = Color.White, fontWeight = FontWeight.SemiBold)
        }
        MiniMapButton("◎", Modifier.align(Alignment.CenterEnd).padding(end = 18.dp, bottom = 10.dp))
        MiniMapButton("▱", Modifier.align(Alignment.BottomEnd).padding(end = 18.dp, bottom = 18.dp))
        Text("Manaus", color = Color.White.copy(alpha = 0.24f), style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.CenterEnd).padding(end = 50.dp, top = 28.dp))
        CourierPin(modifier = Modifier.align(Alignment.Center))
    }
}

@Composable
private fun DarkMapArt(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        drawRect(Brush.radialGradient(listOf(Color(0xFF17355C), Color(0xFF101928)), center = Offset(w * 0.64f, h * 0.33f), radius = h * 0.8f))
        for (i in 0..10) {
            drawLine(Color.White.copy(alpha = 0.10f), Offset(w * -0.1f, h * (i / 10f)), Offset(w * 1.05f, h * (i / 10f + 0.12f)), strokeWidth = 2f)
            drawLine(Color.White.copy(alpha = 0.08f), Offset(w * (i / 10f), 0f), Offset(w * (i / 10f - 0.22f), h), strokeWidth = 2f)
        }
        val route = Path().apply {
            moveTo(w * 0.52f, h * 0.50f)
            cubicTo(w * 0.68f, h * 0.42f, w * 0.66f, h * 0.18f, w * 0.88f, h * 0.14f)
        }
        drawPath(route, Blue, style = Stroke(width = 7f, cap = StrokeCap.Round))
        drawPath(route, Blue.copy(alpha = 0.28f), style = Stroke(width = 20f, cap = StrokeCap.Round))
        drawCircle(Blue, radius = 14f, center = Offset(w * 0.88f, h * 0.14f))
        drawCircle(Blue.copy(alpha = 0.35f), radius = 32f, center = Offset(w * 0.88f, h * 0.14f))
    }
}

@Composable
private fun MiniMapButton(label: String, modifier: Modifier) {
    Box(
        modifier = modifier
            .size(54.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color.Black.copy(alpha = 0.35f))
            .border(1.dp, Color.White.copy(alpha = 0.20f), RoundedCornerShape(16.dp)),
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = Color.White, style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
private fun CourierPin(modifier: Modifier = Modifier) {
    Box(modifier = modifier.size(118.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            drawCircle(Blue.copy(alpha = 0.18f), radius = size.minDimension * 0.47f)
            drawCircle(Blue.copy(alpha = 0.55f), radius = size.minDimension * 0.33f, style = Stroke(width = 3f))
            drawCircle(Color.White, radius = size.minDimension * 0.09f, center = Offset(size.width / 2f, size.height * 0.24f))
            drawRoundRect(Orange, topLeft = Offset(size.width * 0.42f, size.height * 0.31f), size = androidx.compose.ui.geometry.Size(size.width * 0.16f, size.height * 0.32f))
            drawLine(Color.White, Offset(size.width * 0.36f, size.height * 0.42f), Offset(size.width * 0.64f, size.height * 0.42f), strokeWidth = 8f, cap = StrokeCap.Round)
            drawLine(Color(0xFF111827), Offset(size.width * 0.50f, size.height * 0.20f), Offset(size.width * 0.50f, size.height * 0.82f), strokeWidth = 16f, cap = StrokeCap.Round)
            drawCircle(Color(0xFF111827), radius = size.minDimension * 0.09f, center = Offset(size.width * 0.50f, size.height * 0.82f))
        }
    }
}

@Composable
private fun TelemetryPanel(name: String, deviceId: String, tracking: Boolean, onStart: () -> Unit, onStop: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Panel),
        shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp, bottomStart = 18.dp, bottomEnd = 18.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("◉", color = Orange, style = MaterialTheme.typography.headlineSmall)
                Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                    Text(if (tracking) "Rastreando" else "Pronto para rastrear", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(if (tracking) "Voce esta online e sendo monitorado." else name.ifBlank { deviceId }, color = Muted)
                }
                Text(
                    if (tracking) "Online" else "Parado",
                    color = if (tracking) Green else Muted,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (tracking) Green.copy(alpha = 0.18f) else Color.White.copy(alpha = 0.08f))
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    fontWeight = FontWeight.Bold
                )
            }
            HorizontalDivider(color = Line)
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                StatusMetric("⌖", "GPS", if (tracking) "Online" else "Aguardando", if (tracking) Green else Muted)
                StatusMetric("◎", "Internet", "Online", Green)
                StatusMetric("▯", "Bateria", "--", Green)
            }
            HorizontalDivider(color = Line)
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                BigMetric("Velocidade", "0", "km/h")
                BigMetric("Precisao", "--", "m")
                BigMetric("Direcao", "--", "SE")
                BigMetric("Ultima atualizacao", "agora", "")
            }
            Button(
                onClick = if (tracking) onStop else onStart,
                colors = ButtonDefaults.buttonColors(containerColor = Orange),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth().height(64.dp)
            ) {
                Text(if (tracking) "■  Parar rastreamento" else "▶  Iniciar rastreamento", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun StatusMetric(icon: String, label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(horizontal = 4.dp)) {
        Text(icon, color = color, style = MaterialTheme.typography.headlineSmall)
        Text(label, color = Color.White.copy(alpha = 0.86f), style = MaterialTheme.typography.bodySmall)
        Text(value, color = color, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun BigMetric(label: String, value: String, unit: String) {
    Column(modifier = Modifier.padding(horizontal = 4.dp), horizontalAlignment = Alignment.Start) {
        Text(label, color = Color.White.copy(alpha = 0.80f), style = MaterialTheme.typography.labelMedium, maxLines = 1)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            if (unit.isNotBlank()) Text(unit, color = Orange, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(start = 3.dp, bottom = 2.dp))
        }
    }
}

@Composable
private fun BottomNav() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 28.dp, vertical = 18.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        NavItem("⌂", "Inicio", true)
        NavItem("⌁", "Status", false)
        NavItem("⚙", "Configuracoes", false)
    }
}

@Composable
private fun NavItem(icon: String, label: String, selected: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(icon, color = if (selected) Orange else Muted, style = MaterialTheme.typography.headlineSmall)
        Text(label, color = if (selected) Orange else Muted, style = MaterialTheme.typography.labelMedium)
    }
}
