# Client Image Compression Integration Notes

> How the web PWA and Flutter mobile app compress photos before uploading them
> to `/api/outlets/:id/photo`.

These notes are the **client-side integration guide** for the shared
image-processing policy. Both clients follow the same constants and fallback
behaviour so that warung/outlet photos stay under the worker's 2 MB limit and
load quickly on slow cellular networks.

## Shared image-processing policy

Source of truth: `src/shared/lib/image.ts`

| Constant                     | Value                                   | Meaning                                                          |
| ---------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `IMAGE_MAX_FILE_SIZE_BYTES`  | 2,097,152 B (2 MB)                      | Hard ceiling enforced by the worker; also the mobile safety net. |
| `IMAGE_MAX_EDGE_PX`          | 1600 px                                 | Longest allowed edge after resizing.                             |
| `IMAGE_QUALITY_PERCENT`      | 85                                      | Default encoder quality.                                         |
| `IMAGE_MIN_QUALITY_PERCENT`  | 40                                      | Lowest quality the fallback loop may use.                        |
| `IMAGE_FALLBACK_OUTPUT_TYPE` | `image/jpeg`                            | Default output MIME type.                                        |
| `IMAGE_ALLOWED_EXTENSIONS`   | `jpg`, `jpeg`, `png`, `webp`            | Extensions the worker accepts.                                   |
| `IMAGE_ALLOWED_MIME_TYPES`   | `image/jpeg`, `image/png`, `image/webp` | MIME types the worker accepts.                                   |

The worker upload is at `POST /api/outlets/:id/photo` (see
`src/worker/routes/outlets.ts`). It rejects non-images and files larger than
2 MB, so the clients compress _before_ upload as a fallback.

> **Target recommendation:** although 2 MB is the server ceiling, aim for
> ≤ 500 KB per photo on mobile networks. The helpers below treat 2 MB as the
> fallback ceiling; use the `maxBytes / maxSizeBytes` option to target 500 KB in
> your own call sites if desired.

## Web PWA

### Helper

Use the canvas-based compressor in `src/web/lib/image-compress.ts`.

```ts
import { compressImageFile } from '$lib/image-compress.js';

const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
input.capture = 'environment'; // opens the camera on mobile

input.addEventListener('change', async () => {
  const file = input.files?.[0];
  if (!file) return;

  try {
    // Default: 1600 px edge, JPEG, quality 0.85, max 2 MB.
    const compressed = await compressImageFile(file);

    const formData = new FormData();
    formData.append('photo', compressed);

    const response = await fetch(`/api/outlets/${outletId}/photo`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const { url } = await response.json();
    console.log('uploaded', url);
  } catch (err) {
    console.error('photo upload failed', err);
  }
});

input.click();
```

### Optional: update outlet location on upload

The worker photo endpoint also accepts `update_location=true` plus
`latitude`, `longitude`, and `accuracy_m` to refresh the warung location from
the same GPS reading:

```ts
const formData = new FormData();
formData.append('photo', compressed);
formData.append('update_location', 'true');
formData.append('latitude', latitude.toFixed(6));
formData.append('longitude', longitude.toFixed(6));
formData.append('accuracy_m', accuracy?.toFixed(1) ?? '');
```

### Integration points

- Call `compressImageFile` from `PhotoUploader.svelte` before appending the file
  to `FormData`.
- The helper returns a real `File`, so existing `fetch`/`FormData` code needs no
  special casing.
- It runs in the main window thread because it needs `document.createElement`.
  Do not run it inside a service worker.

## Flutter mobile app

### Helper

Use `mobile/lib/core/image/image_compressor.dart`.

```dart
import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';
import 'package:konsi_mobile/config/constants.dart';
import 'package:konsi_mobile/core/image/image_compressor.dart';
import 'package:konsi_mobile/data/repositories/outlet_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

Future<void> captureAndUploadPhoto(
  WidgetRef ref,
  String outletId,
) async {
  final picker = ImagePicker();

  // First pass: let the native picker down-size and pre-compress.
  final picked = await picker.pickImage(
    source: ImageSource.camera,
    maxWidth: KonsiConstants.photoMaxEdgePx.toDouble(),
    maxHeight: KonsiConstants.photoMaxEdgePx.toDouble(),
    imageQuality: KonsiConstants.photoQuality,
  );

  if (picked == null) return;

  // Second pass: client-side fallback compressor ensures the bytes fit.
  final compressed = await ImageCompressor.compressFile(picked.path);
  if (compressed == null || compressed.isEmpty) {
    throw Exception('Gagal mengompres foto');
  }

  final filename = ImageCompressor.compressedFileName(picked.name);
  await ref.read(outletRepositoryProvider).uploadPhoto(outletId, compressed, filename);
}
```

### Using in-memory bytes

If the image already lives in memory (for example, from
`picked.readAsBytes()`), use `compressList`:

```dart
final bytes = await picked.readAsBytes();
final compressed = await ImageCompressor.compressList(
  bytes,
  extension: 'jpg',
);
```

### Integration points

- `OutletFormPage` already uses `flutter_image_compress` directly. Replace its
  private `_compressPhoto` with `ImageCompressor.compressFile` so the fallback
  loop and constants stay in one place.
- `OutletRepository.uploadPhoto` already accepts `Uint8List`, so wiring the new
  helper is a drop-in change.
- Always pass `filename` ending in `.jpg` so the server stores the correct
  extension and content type.

## Error handling checklist

- **Before compression:** validate that the picked file is an image. Both
  clients should rely on the MIME type/accept attribute, but never trust it
  for size decisions.
- **After compression:** if the helper throws or returns `null`, show a toast
  and keep the form editable. Do not retry automatically on an unbounded loop.
- **After upload:** treat HTTP 413/400 from the worker as a compression failure
  and prompt the user to retake the photo.
- **Orientation:** on Flutter, `ImagePicker` handles EXIF orientation. On the
  web, `createImageBitmap` does not normalise EXIF orientation in every browser;
  if photo rotation becomes an issue, add an EXIF orientation library before
  drawing to the canvas.

## Testing

- Web: `pnpm test:unit` covers `src/web/lib/__tests__/image-compression.test.ts`.
- Mobile: add a widget or integration test that picks a large asset, runs
  `ImageCompressor.compressList`, and asserts `lengthInBytes` is below the
  chosen `maxBytes`.
