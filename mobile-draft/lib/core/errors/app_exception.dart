import 'package:equatable/equatable.dart';

/// Base exception for Konsi Mobile.
sealed class AppException extends Equatable implements Exception {
  const AppException(this.message, {this.code});

  final String message;
  final String? code;

  @override
  List<Object?> get props => [message, code];
}

class NetworkException extends AppException {
  const NetworkException(super.message, {super.code});
}

class AuthException extends AppException {
  const AuthException(super.message, {super.code});
}

class ValidationException extends AppException {
  const ValidationException(super.message, {super.code});
}

class ServerException extends AppException {
  const ServerException(super.message, {super.code});
}

class GeofenceException extends AppException {
  const GeofenceException(super.message, {this.distanceM, this.radiusM, super.code});

  final double? distanceM;
  final double? radiusM;

  @override
  List<Object?> get props => [message, distanceM, radiusM, code];
}

class ConflictException extends AppException {
  const ConflictException(super.message, {super.code});
}
