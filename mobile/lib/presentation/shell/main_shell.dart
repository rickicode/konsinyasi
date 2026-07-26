import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/data/sync/sync_manager.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:konsi_mobile/providers/sync_provider.dart';
import 'package:konsi_mobile/providers/visit_draft_provider.dart';

class MainShell extends ConsumerStatefulWidget {
  const MainShell({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _selectedIndex = 0;

  // Staff navigation - hanya fitur lapangan
  final List<_NavItem> _staffItems = const [
    _NavItem(
      label: 'Beranda',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      route: '/',
    ),
    _NavItem(
      label: 'Kunjungan',
      icon: Icons.assignment_outlined,
      selectedIcon: Icons.assignment,
      route: '/kunjungan',
    ),
    _NavItem(
      label: 'Warung',
      icon: Icons.storefront_outlined,
      selectedIcon: Icons.storefront,
      route: '/warung',
    ),
    _NavItem(
      label: 'Profil',
      icon: Icons.person_outline,
      selectedIcon: Icons.person,
      route: '/profil',
    ),
  ];

  // Owner navigation - akses penuh termasuk admin
  final List<_NavItem> _ownerItems = const [
    _NavItem(
      label: 'Beranda',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      route: '/',
    ),
    _NavItem(
      label: 'Kunjungan',
      icon: Icons.assignment_outlined,
      selectedIcon: Icons.assignment,
      route: '/kunjungan',
    ),
    _NavItem(
      label: 'Warung',
      icon: Icons.storefront_outlined,
      selectedIcon: Icons.storefront,
      route: '/warung',
    ),
    _NavItem(
      label: 'Admin',
      icon: Icons.admin_panel_settings_outlined,
      selectedIcon: Icons.admin_panel_settings,
      route: '/admin',
    ),
    _NavItem(
      label: 'Profil',
      icon: Icons.person_outline,
      selectedIcon: Icons.person,
      route: '/profil',
    ),
  ];

  List<_NavItem> get _navItems {
    final auth = ref.watch(authNotifierProvider);
    return auth.isOwner ? _ownerItems : _staffItems;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final location = GoRouterState.of(context).uri.path;
    final items = _navItems;
    final index = items.indexWhere((item) => item.route == location);
    if (index != -1) {
      _selectedIndex = index;
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _navItems;
    final sync = ref.watch(syncStateProvider);
    final auth = ref.watch(authNotifierProvider);

    return Scaffold(
      body: Column(
        children: [
          // Header banner untuk menunjukkan role
          if (auth.isOwner)
            _RoleBanner(
              label: 'Mode Owner',
              color: KonsiColors.caramel,
              icon: Icons.admin_panel_settings,
            )
          else
            _RoleBanner(
              label: 'Mode Staff Lapangan',
              color: Colors.green,
              icon: Icons.engineering,
            ),
          _SyncStatusBanner(state: sync),
          Expanded(child: widget.child),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
          context.go(items[index].route);
        },
        backgroundColor: KonsiColors.coffeeCream,
        indicatorColor: KonsiColors.caramel.withOpacity(0.2),
        destinations: items.map((item) => _buildDestination(item)).toList(),
      ),
    );
  }

  NavigationDestination _buildDestination(_NavItem item) {
    final draftCount = item.label == 'Kunjungan'
        ? ref.watch(visitDraftCountProvider).valueOrNull ?? 0
        : 0;

    final icon = Icon(item.icon, color: KonsiColors.mediumCoffee);
    final selectedIcon = Icon(item.selectedIcon, color: KonsiColors.caramel);

    return NavigationDestination(
      icon: draftCount > 0
          ? Badge(
              smallSize: 8,
              child: icon,
            )
          : icon,
      selectedIcon: draftCount > 0
          ? Badge(
              smallSize: 8,
              child: selectedIcon,
            )
          : selectedIcon,
      label: item.label,
    );
  }
}

// Widget banner untuk menunjukkan role user
class _RoleBanner extends StatelessWidget {
  const _RoleBanner({
    required this.label,
    required this.color,
    required this.icon,
  });

  final String label;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: color.withOpacity(0.1),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _SyncStatusBanner extends StatelessWidget {
  const _SyncStatusBanner({required this.state});

  final SyncState state;

  @override
  Widget build(BuildContext context) {
    if (state.status == SyncStatus.idle) {
      return const SizedBox.shrink();
    }

    if (state.status == SyncStatus.syncing) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: KonsiColors.caramel,
            child: const Row(
              children: [
                SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: KonsiColors.coffeeCream,
                  ),
                ),
                SizedBox(width: 10),
                Text(
                  'Menyinkronkan data...',
                  style: TextStyle(
                    color: KonsiColors.coffeeCream,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const LinearProgressIndicator(
            backgroundColor: KonsiColors.coffeeMilk,
            valueColor: AlwaysStoppedAnimation<Color>(KonsiColors.caramel),
          ),
        ],
      );
    }

    final isError = state.status == SyncStatus.error;
    final isOffline = state.status == SyncStatus.offline;

    if (!isError && !isOffline && state.lastMessage == null) {
      return const SizedBox.shrink();
    }

    final background = isError
        ? KonsiColors.berrySoft
        : isOffline
            ? KonsiColors.lemonSoft
            : KonsiColors.mintSoft;
    final foreground = isError
        ? KonsiColors.berry
        : isOffline
            ? KonsiColors.honey
            : KonsiColors.mintLeaf;
    final icon = isError
        ? Icons.error_outline
        : isOffline
            ? Icons.cloud_off_outlined
            : Icons.check_circle_outline;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: background,
      child: Row(
        children: [
          Icon(icon, size: 18, color: foreground),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              state.lastMessage ?? '',
              style: TextStyle(
                color: foreground,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem {
  const _NavItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.route,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String route;
}
