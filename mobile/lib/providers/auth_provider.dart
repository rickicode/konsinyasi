import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/core/storage/secure_storage.dart';
import 'package:konsi_mobile/core/storage/session_manager.dart';
import 'package:konsi_mobile/data/datasources/remote/auth_api.dart';
import 'package:konsi_mobile/data/models/user_model.dart';
import 'package:konsi_mobile/data/repositories/auth_repository.dart';

// Core providers
final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});

final sessionManagerProvider = Provider<SessionManager>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return SessionManager(secureStorage: storage);
});

final dioProvider = Provider<Dio>((ref) {
  return createDioClient(withBearerAuth: true);
});

final authApiProvider = Provider<AuthApi>((ref) {
  return AuthApi(dio: ref.watch(dioProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    authApi: ref.watch(authApiProvider),
    sessionManager: ref.watch(sessionManagerProvider),
  );
});

/// Auth state.
class AuthState {
  const AuthState({
    this.user,
    this.isLoading = false,
    this.error,
  });

  final UserModel? user;
  final bool isLoading;
  final String? error;

  bool get isAuthenticated => user != null;
  bool get isOwner => user?.isOwner ?? false;
  bool get isStaff => user?.isStaff ?? false;

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Auth state notifier.
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repository, this._sessionManager)
      : super(const AuthState());

  final AuthRepository _repository;
  final SessionManager _sessionManager;

  Future<void> initialize() async {
    state = state.copyWith(isLoading: true);

    await _sessionManager.restoreSession();
    if (!_sessionManager.isLoggedIn) {
      state = state.copyWith(isLoading: false);
      return;
    }

    final user = await _repository.getCurrentUser();
    state = state.copyWith(
      user: user,
      isLoading: false,
      error: user == null ? 'Sesi berakhir, silakan login.' : null,
    );
  }

  Future<bool> login({
    required String username,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final user = await _repository.login(
        username: username,
        password: password,
      );
      state = state.copyWith(user: user, isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    await _repository.logout();
    state = const AuthState();
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authRepositoryProvider),
    ref.watch(sessionManagerProvider),
  );
});
