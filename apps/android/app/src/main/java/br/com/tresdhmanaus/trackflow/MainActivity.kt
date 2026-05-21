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
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import br.com.tresdhmanaus.trackflow.tracking.TrackingService
import br.com.tresdhmanaus.trackflow.ui.TrackFlowTheme

private val Orange = Color(0xFFF4672C)
private val Ink = Color(0xFF0B0F16)
private val Panel = Color(0xFF161D26)
private val Line = Color(0xFF303A46)
private val Muted = Color(0xFFA8B0BC)
private val Green = Color(0xFF57E35B)

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TrackFlowTheme {
                val settings by viewModel.settings.collectAsState()
                TrackFlowScreen(
                    registered = settings.registered,
                    deviceId = settings.deviceId,
                    deliveryName = settings.deliveryName,
                    onRegister = viewModel::register,
                    onStartTracking = { startTrackingService() },
                    onStopTracking = { stopService(Intent(this, TrackingService::class.java)) }
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
    onRegister: (String, String, (Result<Unit>) -> Unit) -> Unit,
    onStartTracking: () -> Unit,
    onStopTracking: () -> Unit
) {
    val focusManager = LocalFocusManager.current
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        onStartTracking()
    }

    Surface(modifier = Modifier.fillMaxSize(), color = Ink) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color(0xFF111824), Ink)))
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() }
                ) { focusManager.clearFocus() }
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(22.dp)
        ) {
            Header()
            if (registered) {
                TrackingHome(
                    name = deliveryName,
                    deviceId = deviceId,
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
                RegisterForm(deviceId = deviceId, onRegister = onRegister)
            }
        }
    }
}

@Composable
private fun Header() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.verticalGradient(listOf(Color(0xFF1A2330), Color(0xFF101720))))
            .border(1.dp, Color.White.copy(alpha = 0.06f), RoundedCornerShape(24.dp))
            .padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text("3D", color = Color.White, style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black)
            Text("H", color = Orange, style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black)
        }
        Text("TRACKFLOW", color = Orange, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
        Text("RASTREAMENTO INTELIGENTE", color = Color.White.copy(alpha = 0.72f), style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun RegisterForm(deviceId: String, onRegister: (String, String, (Result<Unit>) -> Unit) -> Unit) {
    val focusManager = LocalFocusManager.current
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(22.dp)) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Cadastro do entregador", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Informe seus dados para iniciar o rastreamento.", color = Muted, style = MaterialTheme.typography.bodyMedium)
            PremiumField(
                value = name,
                onValueChange = { name = it },
                label = "Nome do entregador",
                placeholder = "Maria Silva",
                imeAction = ImeAction.Next
            )
            PremiumField(
                value = phone,
                onValueChange = { phone = it },
                label = "Telefone",
                placeholder = "(92) 99999-9999",
                imeAction = ImeAction.Done,
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() })
            )
            DeviceIdBox(deviceId)
            SecureBox()
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
                    .height(64.dp)
            ) {
                Text("▶  Cadastrar e iniciar", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            if (message.isNotBlank()) Text(message, color = Muted)
        }
    }
}

@Composable
private fun PremiumField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    imeAction: ImeAction,
    keyboardActions: KeyboardActions = KeyboardActions.Default
) {
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(label, color = Color.White.copy(alpha = 0.86f), style = MaterialTheme.typography.bodyMedium)
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
                focusedContainerColor = Color(0xFF111821),
                unfocusedContainerColor = Color(0xFF111821),
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
private fun DeviceIdBox(deviceId: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0xFF111821))
            .border(1.dp, Line, RoundedCornerShape(14.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text("Device ID", color = Muted, style = MaterialTheme.typography.labelMedium)
            Text(deviceId.ifBlank { "gerando..." }, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Text("auto", color = Orange, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun SecureBox() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF101720))
            .border(1.dp, Line, RoundedCornerShape(16.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(Modifier.size(34.dp).clip(CircleShape).background(Orange.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Text("✓", color = Orange, fontWeight = FontWeight.Bold)
        }
        Column(modifier = Modifier.weight(1f)) {
            Text("Conexao segura com o servidor", color = Color.White, fontWeight = FontWeight.SemiBold)
            Text("Seus dados e sua localizacao estao protegidos.", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
        Text("●", color = Green)
    }
}

@Composable
private fun TrackingHome(name: String, deviceId: String, onStart: () -> Unit, onStop: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(22.dp)) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(name, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(deviceId, color = Muted, style = MaterialTheme.typography.bodySmall)
                }
                Box(Modifier.clip(RoundedCornerShape(12.dp)).background(Green.copy(alpha = 0.15f)).padding(horizontal = 12.dp, vertical = 7.dp)) {
                    Text("Pronto", color = Green, fontWeight = FontWeight.Bold)
                }
            }
            StatusRow("GPS", "aguardando permissao")
            StatusRow("Internet", "online")
            StatusRow("Ultimo envio", "pendente")
            Spacer(Modifier.height(8.dp))
            Button(onClick = onStart, colors = ButtonDefaults.buttonColors(containerColor = Orange), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().height(58.dp)) {
                Text("Iniciar rastreamento", color = Color.White, fontWeight = FontWeight.Bold)
            }
            OutlinedButton(onClick = onStop, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().height(54.dp)) {
                Text("Parar rastreamento")
            }
        }
    }
}

@Composable
private fun StatusRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = Muted)
        Text(value, color = Color.White, fontWeight = FontWeight.SemiBold)
    }
}
