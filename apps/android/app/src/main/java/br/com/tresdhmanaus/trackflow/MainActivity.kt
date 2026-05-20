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
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import br.com.tresdhmanaus.trackflow.tracking.TrackingService
import br.com.tresdhmanaus.trackflow.ui.TrackFlowTheme

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

    Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF111316)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() }
                ) { focusManager.clearFocus() }
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
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
    Column {
        Text("3DH", color = Color(0xFFF4672C), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
        Text("TrackFlow Entregador", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text("Rastreamento seguro em tempo real", color = Color(0xFF9CA3AF), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun RegisterForm(deviceId: String, onRegister: (String, String, (Result<Unit>) -> Unit) -> Unit) {
    val focusManager = LocalFocusManager.current
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1B1F24)), shape = RoundedCornerShape(18.dp)) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Cadastro do entregador", color = Color.White, fontWeight = FontWeight.Bold)
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Nome do entregador") },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Telefone") },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                modifier = Modifier.fillMaxWidth()
            )
            Text("Device ID: ${deviceId.ifBlank { "gerando..." }}", color = Color(0xFF9CA3AF), style = MaterialTheme.typography.bodySmall)
            Button(
                onClick = {
                    onRegister(name, phone) { result ->
                        message = result.fold(
                            onSuccess = { "Cadastro concluido." },
                            onFailure = { it.message ?: "Falha no cadastro." }
                        )
                    }
                },
                enabled = name.trim().length >= 2,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF4672C)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Cadastrar e iniciar")
            }
            if (message.isNotBlank()) Text(message, color = Color(0xFF9CA3AF))
        }
    }
}

@Composable
private fun TrackingHome(name: String, deviceId: String, onStart: () -> Unit, onStop: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1B1F24)), shape = RoundedCornerShape(18.dp)) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(name, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(deviceId, color = Color(0xFF9CA3AF), style = MaterialTheme.typography.bodySmall)
            StatusRow("GPS", "aguardando permissao")
            StatusRow("Internet", "online")
            StatusRow("Ultimo envio", "pendente")
            Spacer(Modifier.height(8.dp))
            Button(onClick = onStart, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF4672C)), modifier = Modifier.fillMaxWidth()) {
                Text("Iniciar rastreamento")
            }
            OutlinedButton(onClick = onStop, modifier = Modifier.fillMaxWidth()) {
                Text("Parar rastreamento")
            }
        }
    }
}

@Composable
private fun StatusRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = Color(0xFF9CA3AF))
        Text(value, color = Color.White, fontWeight = FontWeight.SemiBold)
    }
}
