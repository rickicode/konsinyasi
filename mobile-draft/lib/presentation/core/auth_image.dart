import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';

/// Image loader that attaches the stored Bearer token.
///
/// Use this anywhere the backend's `/api/media/*` endpoint is consumed,
/// because plain `Image.network` cannot send the `Authorization` header.
class AuthImage extends StatefulWidget {
  const AuthImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.placeholder,
    this.errorWidget,
    this.dio,
  });

  final String imageUrl;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Widget? placeholder;
  final Widget? errorWidget;
  final Dio? dio;

  @override
  State<AuthImage> createState() => _AuthImageState();
}

class _AuthImageState extends State<AuthImage> {
  Uint8List? _bytes;
  bool _isLoading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant AuthImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _load();
    }
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
      _bytes = null;
    });
    try {
      final dio = widget.dio ?? createDioClient(withBearerAuth: true);
      final response = await dio.get<List<int>>(
        widget.imageUrl,
        options: Options(responseType: ResponseType.bytes),
      );
      final data = response.data;
      if (data == null) {
        throw Exception('Response foto kosong');
      }
      if (mounted) {
        setState(() {
          _bytes = Uint8List.fromList(data);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Center(
        child: SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: widget.placeholder != null ? KonsiColors.caramel : null,
          ),
        ),
      );
    }

    if (_bytes != null) {
      return Image.memory(
        _bytes!,
        fit: widget.fit,
        width: widget.width,
        height: widget.height,
      );
    }

    return widget.errorWidget ??
        widget.placeholder ??
        const _DefaultPlaceholder();
  }
}

/// Circular avatar that loads an authenticated image from the backend.
class AuthCircleAvatar extends StatelessWidget {
  const AuthCircleAvatar({
    super.key,
    this.imageUrl,
    required this.radius,
    required this.fallbackIcon,
  });

  final String? imageUrl;
  final double radius;
  final IconData fallbackIcon;

  @override
  Widget build(BuildContext context) {
    final url = imageUrl;
    final size = radius * 2;
    return ClipOval(
      child: Container(
        width: size,
        height: size,
        color: KonsiColors.coffeeFoam,
        child: url != null && url.isNotEmpty
            ? AuthImage(
                imageUrl: url,
                fit: BoxFit.cover,
                width: size,
                height: size,
                placeholder: Icon(fallbackIcon, color: KonsiColors.lightCoffee, size: radius * 0.9),
              )
            : Icon(fallbackIcon, color: KonsiColors.lightCoffee, size: radius * 0.9),
      ),
    );
  }
}

class _DefaultPlaceholder extends StatelessWidget {
  const _DefaultPlaceholder();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Icon(Icons.broken_image_outlined, color: KonsiColors.lightCoffee),
    );
  }
}
