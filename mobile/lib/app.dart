import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/presentation/master/admin_hub_page.dart';
import 'package:konsi_mobile/presentation/auth/login_page.dart';
import 'package:konsi_mobile/presentation/auth/profile_page.dart';
import 'package:konsi_mobile/presentation/dashboard/dashboard_page.dart';
import 'package:konsi_mobile/presentation/dashboard/staff_dashboard_page.dart';
import 'package:konsi_mobile/presentation/onboarding/onboarding_page.dart';
import 'package:konsi_mobile/presentation/shell/main_shell.dart';
import 'package:konsi_mobile/presentation/splash/splash_page.dart';
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
import 'package:konsi_mobile/presentation/analytics/analytics_page.dart';
import 'package:konsi_mobile/presentation/analytics/outlet_analytics_page.dart';
import 'package:konsi_mobile/presentation/analytics/product_analytics_page.dart';
import 'package:konsi_mobile/presentation/visits/place_coffee_page.dart';
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
      final path = state.uri.path;
      final isLoginRoute = path == '/login';

      // Allow public splash/onboarding routes.
      if (path == '/splash' || path == '/onboarding') {
        return null;
      }

      if (isLoading) return null;

      if (!isAuthenticated && !isLoginRoute) {
        return '/login';
      }

      if (isAuthenticated && isLoginRoute) {
        return '/';
      }

      // Owner-only routes guard (must match web route table).
      if (isAuthenticated && auth.isStaff) {
        const ownerRoutes = [
          '/master',
          '/laporan',
          '/analytics',
          '/pengguna',
          '/pengaturan',
          '/admin',
        ];
        if (ownerRoutes.any((route) => path.startsWith(route))) {
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
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const PlaceCoffeePage(),
          ),
          GoRoute(
            path: '/beranda',
            builder: (context, state) => auth.isOwner
                ? const DashboardPage()
                : const StaffDashboardPage(),
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
            path: '/kunjungan',
            builder: (context, state) => const VisitListPage(),
          ),
          GoRoute(
            path: '/kunjungan/:id',
            builder: (context, state) => VisitFormPage(
              outletId: state.pathParameters['id']!,
              draftId: state.uri.queryParameters['draftId'],
            ),
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
            path: '/produk',
            builder: (context, state) => const ProductListPage(),
          ),
          GoRoute(
            path: '/admin',
            builder: (context, state) => const AdminHubPage(),
          ),
          GoRoute(
            path: '/master',
            builder: (context, state) => const MasterPage(),
          ),
          GoRoute(
            path: '/master/produk',
            builder: (context, state) => const ProductListPage(),
          ),
          GoRoute(
            path: '/master/produk/form',
            builder: (context, state) => const ProductFormPage(),
          ),
          GoRoute(
            path: '/master/bahan',
            builder: (context, state) => const RawMaterialsPage(),
          ),
          GoRoute(
            path: '/master/warung',
            builder: (context, state) => const OutletListPage(),
          ),
          GoRoute(
            path: '/laporan',
          GoRoute(
            path: '/laporan',
            builder: (context, state) => const ReportsPage(),
          ),
          GoRoute(
            path: '/analytics',
            builder: (context, state) => const AnalyticsPage(),
          ),
          GoRoute(
            path: '/analytics/outlet/:id',
            builder: (context, state) => OutletAnalyticsPage(
              outletId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: '/analytics/product/:id',
            builder: (context, state) => ProductAnalyticsPage(
              productId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: '/pengguna',
            builder: (context, state) => const UsersPage(),
          ),
          GoRoute(
            path: '/pengaturan',
            builder: (context, state) => const MasterSettingsPage(),
          ),
          // Backward-compatible aliases for old master paths.
          GoRoute(
            path: '/master/products',
            redirect: (context, state) => '/master/produk',
          ),
          GoRoute(
            path: '/master/products/form',
            redirect: (context, state) => '/master/produk/form',
          ),
          GoRoute(
            path: '/master/raw-materials',
            redirect: (context, state) => '/master/bahan',
          ),
          GoRoute(
            path: '/master/users',
            redirect: (context, state) => '/pengguna',
          ),
          GoRoute(
            path: '/master/settings',
            redirect: (context, state) => '/pengaturan',
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
