import 'package:konsi_mobile/core/errors/app_exception.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/core/storage/session_manager.dart';
import 'package:konsi_mobile/data/datasources/remote/auth_api.dart';
import 'package:konsi_mobile/data/models/auth_model.dart';
import 'package:konsi_mobile/data/models/user_model.dart';

class AuthRepository {
  AuthRepository({
    required AuthApi authApi,
    required SessionManager sessionManager,
  })  : _authApi = authApi,
        _sessionManager = sessionManager;

  final AuthApi _authApi;
  final SessionManager _sessionManager;

  Future<UserModel> login({
    required String username,
    required String password,
  }) async {
    try {
      final response = await _authApi.login(
        LoginRequest(username: username, password: password),
      );

      final accessToken = response.accessToken;
      if (accessToken == null || accessToken.isEmpty) {
        throw const AuthException('Token autentikasi tidak ditemukan');
      }

      await _sessionManager.saveSession(
        accessToken: accessToken,
        refreshToken: response.refreshToken,
      );

      return UserModel(
        id: response.id,
        email: response.email,
        username: response.username,
        name: response.name,
        role: response.role,
        status: 'active',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<UserModel?> getCurrentUser() async {
    if (!_sessionManager.isLoggedIn) return null;

    try {
      return await _authApi.getMe();
    } on AuthException {
      await logout();
      return null;
    } catch (e) {
      throw mapError(e);
    }
  }

  Future<void> logout() async {
    try {
      await _authApi.logout();
    } finally {
      await _sessionManager.clearSession();
    }
  }
}
