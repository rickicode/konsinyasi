import 'dart:typed_data';

import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:konsi_mobile/config/constants.dart';

/// Client-side image compression for the Flutter mobile app.
///
/// This class mirrors the shared image-processing policy:
///   - down-scale so the longest edge is <= [KonsiConstants.photoMaxEdgePx]
///   - encode as JPEG at quality [KonsiConstants.photoQuality] by default
///   - if the encoded bytes are still too large, iteratively lower quality as
///     a fallback until they fit under [KonsiConstants.photoMaxSizeBytes]
class ImageCompressor {
  ImageCompressor._();

  static const int _minQuality = 40;
  static const int _qualityStep = 10;

  /// Compress a file on disk (e.g. the path returned by [ImagePicker]).
  ///
  /// The [maxEdge] value is passed to `minWidth`/`minHeight` so larger images
  /// are reduced while preserving aspect ratio. Smaller images are not upscaled.
  static Future<Uint8List?> compressFile(
    String filePath, {
    int? maxEdge,
    int? maxBytes,
  }) async {
    final edge = maxEdge ?? KonsiConstants.photoMaxEdgePx;
    final targetBytes = maxBytes ?? KonsiConstants.photoMaxSizeBytes;

    Uint8List? result;
    var quality = KonsiConstants.photoQuality;

    do {
      result = await FlutterImageCompress.compressWithFile(
        filePath,
        minWidth: edge,
        minHeight: edge,
        quality: quality,
        format: CompressFormat.jpeg,
      );

      if (result == null) return null;
      if (result.lengthInBytes <= targetBytes) break;

      quality -= _qualityStep;
    } while (quality >= _minQuality);

    return result;
  }

  /// Compress an in-memory image.
  static Future<Uint8List?> compressList(
    Uint8List bytes, {
    required String extension,
    int? maxEdge,
    int? maxBytes,
  }) async {
    final edge = maxEdge ?? KonsiConstants.photoMaxEdgePx;
    final targetBytes = maxBytes ?? KonsiConstants.photoMaxSizeBytes;
    final format = _formatFromExtension(extension);

    Uint8List? result;
    var quality = KonsiConstants.photoQuality;

    do {
      result = await FlutterImageCompress.compressWithList(
        bytes,
        minWidth: edge,
        minHeight: edge,
        quality: quality,
        format: format,
      );

      if (result.lengthInBytes <= targetBytes) break;

      quality -= _qualityStep;
    } while (quality >= _minQuality);

    return result;
  }

  /// Build a normalized `.jpg` file name from any original name.
  static String compressedFileName(String originalName) {
    final dot = originalName.lastIndexOf('.');
    final base = dot > 0 ? originalName.substring(0, dot) : originalName;
    return '${base.isEmpty ? 'photo' : base}.jpg';
  }

  static CompressFormat _formatFromExtension(String extension) {
    switch (extension.toLowerCase()) {
      case 'png':
        return CompressFormat.png;
      case 'webp':
        return CompressFormat.webp;
      case 'jpg':
      case 'jpeg':
      default:
        return CompressFormat.jpeg;
    }
  }
}
