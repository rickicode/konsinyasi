import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/presentation/auth/login_page.dart';
import 'package:konsi_mobile/presentation/auth/profile_page.dart';
import 'package:konsi_mobile/presentation/dashboard/dashboard_page.dart';
import 'package:konsi_mobile/presentation/onboarding/onboarding_page.dart';
import 'package:konsi_mobile/presentation/splash/splash_page.dart';
import 'package:konsi_mobile/presentation/dashboard/staff_dashboard_page.dart';
import 'package:konsi_mobile/presentation/master/master_page.dart';
import 'package:konsi_mobile/presentation/master/product_form_page.dart';
import 'package:konsi_mobile/presentation/master/product_list_page.dart';
import 'package:konsi_mobile/presentation/master/raw_materials_page.dart';
import 'package:konsi_mobile/presentation/master/settings_page.dart';
import 'package:konsi_mobile/presentation/master/users_page.dart';
import 'package:konsi_mobile/presentation/outlets/outlet_detail_page.dart';
import 'package:konsi_mobile/presentation/outlets/outlet_form_page.dart';
import 'package:konsi_mobile/presentation/outlets/outlet_list_page.dart';
import 'package:konsi_mobile/presentation/reports/reports_page.dart';
import 'package:konsi_mobile/presentation/shell/main_shell.dart';
import 'package:konsi_mobile/presentation/visits/visit_drafts_page.dart';
import 'package:konsi_mobile/presentation/visits/visit_form_page.dart';
import 'package:konsi_mobile/presentation/visits/visit_list_page.dart';
import 'package:konsi_mobile/presentation/visits/visit_success_page.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';

class KonsiApp extends ConsumerWidget {
  const KonsiApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);
    return MaterialApp.router(
      title: 'Konsi',
      debugShowCheckedModeBanner: false,
      theme: buildKonsiTheme(brightness: Brightness.light),
      routerConfig: router,
    );
  }
}

final _routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authNotifierProvider);
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: _AuthRefreshListenable(ref),
    redirect: (context, state) {
      final isAuthenticated = auth.isAuthenticated;
      final isLoading = auth.isLoading;
      final isLoginRoute = state.uri.path == '/login';

      if (isLoading) return null;

      if (!isAuthenticated && !isLoginRoute) {
        return '/login';
      }

      if (isAuthenticated && isLoginRoute) {
        return '/';
      }

      // Owner-only routes guard.
      if (isAuthenticated && auth.isStaff) {
        final ownerRoutes = ['/master', '/laporan', '/pengguna', '/pengaturan'];
        if (ownerRoutes.any((route) => state.uri.path.startsWith(route))) {
          return '/';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const DashboardPage(),
          ),
          GoRoute(
            path: '/warung',
            builder: (context, state) => const OutletListPage(),
          ),
          GoRoute(
            path: '/warung/:id',
            builder: (context, state) =>
                OutletDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/warung/form',
            builder: (context, state) => const OutletFormPage(),
          ),
          GoRoute(
            path: '/kunjungan/:id',
            builder: (context, state) => VisitFormPage(
              outletId: state.pathParameters['id']!,
              draftId: state.uri.queryParameters['draftId'],
            ),
          ),
          GoRoute(
            path: '/kunjungan',
            builder: (context, state) => const VisitListPage(),
          ),
          GoRoute(
            path: '/kunjungan/success',
            builder: (context, state) => const VisitSuccessPage(),
          ),
          GoRoute(
            path: '/profil',
            builder: (context, state) => const ProfilePage(),
          ),
          GoRoute(
            path: '/master',
            builder: (context, state) => const MasterPage(),
          ),
          GoRoute(
            path: '/master/products',
            builder: (context, state) => const ProductListPage(),
          ),
          GoRoute(
            path: '/master/products/form',
            builder: (context, state) => const ProductFormPage(),
          ),
          GoRoute(
            path: '/master/raw-materials',
            builder: (context, state) => const RawMaterialsPage(),
          ),
          GoRoute(
            path: '/master/users',
            builder: (context, state) => const UsersPage(),
          ),
          GoRoute(
            path: '/master/settings',
            builder: (context, state) => const MasterSettingsPage(),
          ),
          GoRoute(
            path: '/laporan',
            builder: (context, state) => const ReportsPage(),
          ),
        ],
      ),
    ],
  );
});

class _AuthRefreshListenable extends ChangeNotifier {
  _AuthRefreshListenable(this._ref) {
    _ref.listen(authNotifierProvider, (_, __) => notifyListeners());
  }
  final WidgetRef _ref;
}
