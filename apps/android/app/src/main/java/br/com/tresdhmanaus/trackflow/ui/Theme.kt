package br.com.tresdhmanaus.trackflow.ui

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val TrackFlowColorScheme: ColorScheme = darkColorScheme(
    primary = Color(0xFFF4672C),
    background = Color(0xFF111316),
    surface = Color(0xFF1B1F24),
    onPrimary = Color.White,
    onBackground = Color.White,
    onSurface = Color.White
)

@Composable
fun TrackFlowTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TrackFlowColorScheme,
        content = content
    )
}
