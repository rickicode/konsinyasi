import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter/foundation.dart';

import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/core/errors/app_exception.dart';
import 'package:konsi_mobile/core/storage/secure_storage.dart';

/// Factory for the configured Dio client.
///
/// If [withBearerAuth] is true, an interceptor reads the access token from
/// secure storage before each request and adds an `Authorization: Bearer`
/// header. This is the recommended mode for the mobile app.
Dio createDioClient({bool withBearerAuth = true}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      sendTimeout: ApiConfig.sendTimeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'KonsiMobile',
      },
    ),
  );

  // Cookie jar retained so the same Dio instance can be used for web-style
  // endpoints during the transition period.
  final cookieJar = CookieJar();
  dio.interceptors.add(CookieManager(cookieJar));

  if (withBearerAuth) {
    final secureStorage = SecureStorage();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await secureStorage.getAccessToken();
          if (token != null && token.isNotEmpty && token != 'cookie-session') {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );
  }

  if (kDebugMode) {
    dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (o) => debugPrint(o.toString()),
      ),
    );
  }

  dio.interceptors.add(
    InterceptorsWrapper(
      onError: (error, handler) {
        final exception = _mapDioError(error);
        return handler.reject(
          exception is DioException ? error.copyWith(error: exception) : error,
        );
      },
    ),
  );

  return dio;
}

/// Convert DioError into domain exceptions.
AppException mapError(Object error) {
  if (error is AppException) return error;

  if (error is DioException) {
    return _mapDioError(error);
  }

  return NetworkException('Terjadi kesalahan jaringan: $error');
}

AppException _mapDioError(DioException error) {
  final response = error.response;
  final statusCode = response?.statusCode;
  final data = response?.data;

  final message = _extractMessage(data) ?? error.message ?? 'Terjadi kesalahan';
  final code = data is Map<String, dynamic> ? data['code'] as String? : null;

  if (statusCode == 401) {
    return AuthException(message, code: code ?? 'UNAUTHORIZED');
  }

  if (statusCode == 403) {
    return AuthException('Akses ditolak: $message', code: code ?? 'FORBIDDEN');
  }

  if (statusCode == 400) {
    if (code == 'GEOFENCE_ERROR' ||
code == 'GEOFENCE_VIOLATION' ||
(message.toLowerCase().contains('geofence'))) {
      return GeofenceException(
        message,
        distanceM: _parseDouble(data?['distance_m']),
        radiusM: _parseDouble(data?['geofence_radius_m']),
        code: code,
      );
    }
    return ValidationException(message, code: code ?? 'VALIDATION_ERROR');
  }

  if (statusCode == 409) {
    return ConflictException(message, code: code ?? 'CONFLICT');
  }

  if (statusCode != null && statusCode >= 500) {
    return ServerException(message, code: code ?? 'SERVER_ERROR');
  }

  return NetworkException(message, code: code ?? 'NETWORK_ERROR');
}

String? _extractMessage(dynamic data) {
  if (data is Map<String, dynamic>) {
    final message = data['message'] ?? data['error'];
    if (message is String) return message;
  }
  return null;
}

double? _parseDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}
