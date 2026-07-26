import 'package:konsi_mobile/core/storage/secure_storage.dart';

/// Manages authenticated session state across app restarts.
class SessionManager {
  SessionManager({required SecureStorage secureStorage})
      : _secureStorage = secureStorage;

  final SecureStorage _secureStorage;

  String? _accessToken;
  String? _refreshToken;

  bool get isLoggedIn => _accessToken != null && _accessToken!.isNotEmpty;

  String? get accessToken => _accessToken;

  String? get refreshToken => _refreshToken;

  Future<void> restoreSession() async {
    _accessToken = await _secureStorage.getAccessToken();
    _refreshToken = await _secureStorage.getRefreshToken();
  }

  Future<void> saveSession({
    required String accessToken,
    String? refreshToken,
  }) async {
    await _secureStorage.setAccessToken(accessToken);
    if (refreshToken != null) {
      await _secureStorage.setRefreshToken(refreshToken);
    }
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  Future<void> clearSession() async {
    await _secureStorage.clearTokens();
    _accessToken = null;
    _refreshToken = null;
  }
}
