import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wrapper around FlutterSecureStorage for type-safe token persistence.
class SecureStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accountName: 'konsi_secure_storage',
    ),
  );

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);

  Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> setAccessToken(String token) =>
      _storage.write(key: _accessTokenKey, value: token);

  Future<void> setRefreshToken(String? token) =>
      _storage.write(key: _refreshTokenKey, value: token);

  Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
