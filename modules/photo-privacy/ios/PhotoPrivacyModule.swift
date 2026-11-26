import ExpoModulesCore
import UIKit
import Vision

public final class PhotoPrivacyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VerinalizPhotoPrivacy")

    AsyncFunction("inspect") { (uri: String, left: Double, top: Double, right: Double, bottom: Double) -> [String: Any] in
      guard [left, top, right, bottom].allSatisfy({ (0...1).contains($0) }),
        left < right, top < bottom,
        let original = UIImage(contentsOfFile: try self.cacheFile(uri).path)
      else { throw PhotoPrivacyException() }

      let imageWidth = original.size.width * original.scale
      let imageHeight = original.size.height * original.scale
      let cropX = ceil(CGFloat(left) * imageWidth)
      let cropY = ceil(CGFloat(top) * imageHeight)
      let cropWidth = floor(CGFloat(right) * imageWidth) - cropX
      let cropHeight = floor(CGFloat(bottom) * imageHeight) - cropY
      guard cropWidth > 0, cropHeight > 0 else { throw PhotoPrivacyException() }
      let scale = min(1, 2560 / max(cropWidth, cropHeight))
      let size = CGSize(width: max(1, (cropWidth * scale).rounded()), height: max(1, (cropHeight * scale).rounded()))
      let format = UIGraphicsImageRendererFormat()
      format.scale = 1
      format.opaque = true
      let crop = UIGraphicsImageRenderer(size: size, format: format).image { context in
        context.cgContext.setFillColor(UIColor.white.cgColor)
        context.fill(CGRect(origin: .zero, size: size))
        let scaleX = size.width / cropWidth
        let scaleY = size.height / cropHeight
        original.draw(in: CGRect(x: -cropX * scaleX, y: -cropY * scaleY,
          width: imageWidth * scaleX, height: imageHeight * scaleY))
      }
      guard let image = crop.cgImage else { throw PhotoPrivacyException() }
      let handler = VNImageRequestHandler(cgImage: image)
      let faces = VNDetectFaceRectanglesRequest()
      let people = VNDetectHumanRectanglesRequest()
      people.upperBodyOnly = true
      try handler.perform([faces, people])
      if !(faces.results ?? []).isEmpty || !(people.results ?? []).isEmpty {
        return ["hasPerson": true]
      }

      let reader = VNRecognizeTextRequest()
      reader.recognitionLevel = .accurate
      let supported = try reader.supportedRecognitionLanguages()
      let preferred = supported.filter { $0.hasPrefix("tr") || $0 == "en-US" }
      if !preferred.isEmpty { reader.recognitionLanguages = preferred }
      reader.usesLanguageCorrection = false
      try handler.perform([reader])
      let text = (reader.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
      let output = FileManager.default.temporaryDirectory
        .appendingPathComponent("photo-privacy-\(UUID().uuidString).jpg")
      guard let jpeg = crop.jpegData(compressionQuality: 0.92) else { throw PhotoPrivacyException() }
      try jpeg.write(to: output, options: [.atomic])
      return ["hasPerson": false, "text": text, "uri": output.absoluteString,
        "width": image.width, "height": image.height]
    }

    AsyncFunction("discard") { (uri: String) in
      let file = try self.cacheFile(uri)
      if FileManager.default.fileExists(atPath: file.path) {
        try FileManager.default.removeItem(at: file)
      }
    }
  }

  private func cacheFile(_ uri: String) throws -> URL {
    guard let url = URL(string: uri), url.isFileURL else { throw PhotoPrivacyException() }
    let file = url.resolvingSymlinksInPath().standardizedFileURL
    let manager = FileManager.default
    let directories = [manager.temporaryDirectory, appContext?.config.cacheDirectory].compactMap { $0 }
      + manager.urls(for: .cachesDirectory, in: .userDomainMask)
    let inCache = directories.contains {
      let path = $0.resolvingSymlinksInPath().standardizedFileURL.path
      return file.path.hasPrefix(path + "/")
    }
    guard inCache, file.pathExtension.lowercased() == "jpg" else { throw PhotoPrivacyException() }
    return file
  }
}

private final class PhotoPrivacyException: Exception {
  override var reason: String { "Photo could not be prepared" }
}
