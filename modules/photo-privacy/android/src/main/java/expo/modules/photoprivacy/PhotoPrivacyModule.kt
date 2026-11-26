package expo.modules.photoprivacy

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.roundToInt

class PhotoPrivacyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VerinalizPhotoPrivacy")

    AsyncFunction("inspect") { uri: String, left: Double, top: Double, right: Double, bottom: Double ->
      require(listOf(left, top, right, bottom).all { it in 0.0..1.0 } && left < right && top < bottom)
      val source = BitmapFactory.decodeFile(cacheFile(uri).path) ?: error("Photo could not be decoded")
      val x = ceil(left * source.width).toInt()
      val y = ceil(top * source.height).toInt()
      val width = floor(right * source.width).toInt() - x
      val height = floor(bottom * source.height).toInt() - y
      var crop = Bitmap.createBitmap(source, x, y, width, height)
      if (crop !== source) source.recycle()
      val scale = 2560.0 / maxOf(width, height)
      if (scale < 1) {
        val smaller = Bitmap.createScaledBitmap(crop, (width * scale).roundToInt().coerceAtLeast(1),
          (height * scale).roundToInt().coerceAtLeast(1), true)
        crop.recycle()
        crop = smaller
      }
      try {
        val input = InputImage.fromBitmap(crop, 0)
        if (containsPerson(input)) {
          mapOf("hasPerson" to true)
        } else {
          val reader = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
          val text = try { Tasks.await(reader.process(input)).text } finally { reader.close() }
          val output = File.createTempFile("photo-privacy-", ".jpg", appContext.cacheDirectory)
          try {
            output.outputStream().use { check(crop.compress(Bitmap.CompressFormat.JPEG, 92, it)) }
            mapOf("hasPerson" to false, "text" to text, "uri" to Uri.fromFile(output).toString(),
              "width" to crop.width, "height" to crop.height)
          } catch (error: Exception) {
            output.delete()
            throw error
          }
        }
      } finally {
        crop.recycle()
      }
    }

    AsyncFunction("discard") { uri: String ->
      cacheFile(uri).delete()
      Unit
    }
  }

  private fun cacheFile(uri: String): File {
    val url = Uri.parse(uri)
    require(url.scheme == "file")
    val file = File(requireNotNull(url.path)).canonicalFile
    val cache = appContext.cacheDirectory.canonicalFile
    require(file.path.startsWith(cache.path + File.separator) && file.extension.equals("jpg", ignoreCase = true))
    return file
  }

  private fun containsPerson(input: InputImage): Boolean {
    val faces = FaceDetection.getClient(FaceDetectorOptions.Builder()
      .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
      .setMinFaceSize(0.08f)
      .build())
    try {
      if (Tasks.await(faces.process(input)).isNotEmpty()) return true
    } finally { faces.close() }

    val detector = PoseDetection.getClient(PoseDetectorOptions.Builder()
      .setDetectorMode(PoseDetectorOptions.SINGLE_IMAGE_MODE).build())
    return try {
      Tasks.await(detector.process(input)).allPoseLandmarks.count { landmark ->
        landmark.inFrameLikelihood >= 0.65f
      } >= 3
    } finally { detector.close() }
  }
}
