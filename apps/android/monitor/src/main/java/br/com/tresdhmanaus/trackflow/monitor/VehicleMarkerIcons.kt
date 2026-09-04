package br.com.tresdhmanaus.trackflow.monitor

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.drawable.BitmapDrawable
import kotlin.math.cos
import kotlin.math.sin

/** Original portal artwork and CSS filters, rendered once per vehicle/status. */
internal class VehicleMarkerIcons(private val context: Context) {
    private data class Spec(val resource: Int, val width: Int, val height: Int)
    private val specs = mapOf(
        "motorcycle" to Spec(R.drawable.courier_top, 42, 58),
        "car" to Spec(R.drawable.vehicle_car, 92, 62),
        "boat" to Spec(R.drawable.vehicle_boat, 82, 46),
        "airplane" to Spec(R.drawable.vehicle_airplane, 92, 62),
        "bus" to Spec(R.drawable.vehicle_bus, 110, 32)
    )
    private val cache = mutableMapOf<Pair<String, String>, Bitmap>()

    fun icon(vehicleType: String, status: String): BitmapDrawable {
        val type = vehicleType.takeIf { it in specs } ?: "motorcycle"
        val appearance = status.takeIf { it == "offline" || it == "sem sinal" } ?: "online"
        val bitmap = cache.getOrPut(type to appearance) { render(specs.getValue(type), appearance) }
        return BitmapDrawable(context.resources, bitmap)
    }

    private fun render(spec: Spec, status: String): Bitmap {
        val density = context.resources.displayMetrics.density
        val width = spec.width * density
        val height = spec.height * density
        val padding = 28 * density
        val source = BitmapFactory.decodeResource(context.resources, spec.resource)
        val scale = minOf(width / source.width, height / source.height)
        val drawWidth = source.width * scale
        val drawHeight = source.height * scale
        val result = Bitmap.createBitmap((width + padding * 2).toInt(), (height + padding * 2).toInt(), Bitmap.Config.ARGB_8888)
        result.density = context.resources.displayMetrics.densityDpi
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
            when (status) {
                "offline" -> {
                    colorFilter = ColorMatrixColorFilter(floatArrayOf(
                        .2126f, .7152f, .0722f, 0f, 0f,
                        .2126f, .7152f, .0722f, 0f, 0f,
                        .2126f, .7152f, .0722f, 0f, 0f,
                        0f, 0f, 0f, 1f, 0f
                    ))
                    alpha = (255 * 0.76f).toInt()
                }
                "sem sinal" -> colorFilter = ColorMatrixColorFilter(noSignalFilter())
            }
            val shadowOpacity = when (status) { "offline" -> 0.28f; "sem sinal" -> 0.32f; else -> 0.35f }
            setShadowLayer(10 * density, 0f, 8 * density, Color.argb((255 * shadowOpacity).toInt(), 23, 32, 38))
        }
        val left = padding + (width - drawWidth) / 2
        val top = padding + (height - drawHeight) / 2
        Canvas(result).drawBitmap(source, null, RectF(left, top, left + drawWidth, top + drawHeight), paint)
        source.recycle()
        return result
    }

    private fun noSignalFilter(): ColorMatrix {
        // CSS: sepia(0.55) saturate(1.5) hue-rotate(345deg), in that order.
        val sepia = ColorMatrix(floatArrayOf(
            0.66615f, 0.42295f, 0.10395f, 0f, 0f,
            0.19195f, 0.82730f, 0.09240f, 0f, 0f,
            0.14960f, 0.29370f, 0.52205f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        ))
        // CSS luminance coefficients differ slightly from Android setSaturation.
        val saturation = ColorMatrix(floatArrayOf(
            1.3935f, -0.3575f, -0.036f, 0f, 0f,
            -0.1065f, 1.1425f, -0.036f, 0f, 0f,
            -0.1065f, -0.3575f, 1.464f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        ))
        val angle = Math.toRadians(345.0)
        val c = cos(angle).toFloat()
        val s = sin(angle).toFloat()
        val hue = ColorMatrix(floatArrayOf(
            .213f + c * .787f - s * .213f, .715f - c * .715f - s * .715f, .072f - c * .072f + s * .928f, 0f, 0f,
            .213f - c * .213f + s * .143f, .715f + c * .285f + s * .140f, .072f - c * .072f - s * .283f, 0f, 0f,
            .213f - c * .213f - s * .787f, .715f - c * .715f + s * .715f, .072f + c * .928f + s * .072f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        ))
        sepia.postConcat(saturation)
        sepia.postConcat(hue)
        return sepia
    }
}
