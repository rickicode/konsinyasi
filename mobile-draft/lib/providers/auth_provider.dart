import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/core/network/dio_client.dart';
import 'package:konsi_mobile/core/storage/secure_storage.dart';
import 'package:konsi_mobile/core/storage/session_manager.dart';
import 'package:konsi_mobile/data/datasources/remote/auth_api.dart';
import 'package:konsi_mobile/data/models/user_model.dart';
import 'package:konsi_mobile/data/repositories/auth_repository.dart';

/// Capability constants aligned with the web app.
class Capability {
  Capability._();

  static const String auth = 'auth';
  static const String dashboardRead = 'dashboard:read';
  static const String visitRead = 'visit:read';
  static const String visitWrite = 'visit:write';
  static const String visitVoid = 'visit:void';
  static const String visitOverride = 'visit:override';
  static const String outletsWrite = 'outlets:write';
  static const String settingsRead = 'settings:read';
  static const String settingsWrite = 'settings:write';
  static const String reportsRead = 'reports:read';
  static const String productsRead = 'products:read';
  static const String productsWrite = 'products:write';
  static const String bomWrite = 'bom:write';
  static const String rawMaterialsRead = 'raw_materials:read';
  static const String rawMaterialsWrite = 'raw_materials:write';
  static const String usersManage = 'users:manage';
  static const String masterDelete = 'master:delete';

  static const List<String> _all = [
    auth,
    dashboardRead,
    visitRead,
    visitWrite,
    visitVoid,
    visitOverride,
    outletsWrite,
    settingsRead,
    settingsWrite,
    reportsRead,
    productsRead,
    productsWrite,
    bomWrite,
    rawMaterialsRead,
    rawMaterialsWrite,
    usersManage,
    masterDelete,
  ];

  static Set<String> forRole(String? role) {
    if (role == 'owner') return Set<String>.of(_all);
    return const {
      auth,
      dashboardRead,
      visitRead,
      visitWrite,
      outletsWrite,
      settingsRead,
      productsRead,
      productsWrite,
    };
  }
}

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

  /// Current user's role slug, or null when logged out.
  String? get role => user?.role;

  /// Capability set for the current user (empty when logged out).
  Set<String> get capabilities => Capability.forRole(user?.role);

  /// Check whether the current user has a capability.
  bool can(String capability) => capabilities.contains(capability);

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
