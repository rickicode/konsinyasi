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
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  // Staff navigation - matches web bottom tabs.
  final List<_NavItem> _staffItems = const [
    _NavItem(
      label: 'Beranda',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      route: '/beranda',
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
      label: 'Produk',
      icon: Icons.local_drink_outlined,
      selectedIcon: Icons.local_drink,
      route: '/produk',
    ),
  ];

  // Owner navigation - matches web bottom tabs.
  final List<_NavItem> _ownerItems = const [
    _NavItem(
      label: 'Beranda',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      route: '/beranda',
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
      label: 'Master',
      icon: Icons.dashboard_outlined,
      selectedIcon: Icons.dashboard,
      route: '/master',
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
    final index = items.indexWhere((item) =>
        location == item.route || location.startsWith('${item.route}/'));
    if (index != -1) {
      _selectedIndex = index;
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _navItems;
    final sync = ref.watch(syncStateProvider);
    final auth = ref.watch(authNotifierProvider);
    final location = GoRouterState.of(context).uri.path;

    return Scaffold(
      key: _scaffoldKey,
      drawer: _MenuDrawer(
        role: auth.role,
        currentPath: location,
        onLogout: () => ref.read(authNotifierProvider.notifier).logout(),
      ),
      body: Column(
        children: [
          _KonsiTopBar(
            title: _pageTitle(location, isOwner: auth.isOwner),
            subtitle: auth.isOwner ? 'Owner' : 'Staff Lapangan',
            onMenuPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),
          _SyncStatusBanner(state: sync),
          Expanded(child: widget.child),
        ],
      ),
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          iconTheme: MaterialStateProperty.resolveWith((states) {
            final selected = states.contains(MaterialState.selected);
            return IconThemeData(
              color: selected ? KonsiColors.coffeeWhite : KonsiColors.mediumCoffee,
            );
          }),
          labelTextStyle: MaterialStateProperty.resolveWith((states) {
            final selected = states.contains(MaterialState.selected);
            return TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: selected ? KonsiColors.darkCoffee : KonsiColors.mediumCoffee,
            );
          }),
        ),
        child: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: (index) {
            setState(() => _selectedIndex = index);
            context.go(items[index].route);
          },
          backgroundColor: KonsiColors.coffeeCream,
          indicatorColor: KonsiColors.darkCoffee,
          indicatorShape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
          ),
          destinations: items.map((item) => _buildDestination(item)).toList(),
        ),
      ),
    );
  }

  NavigationDestination _buildDestination(_NavItem item) {
    final draftCount = item.label == 'Kunjungan'
        ? ref.watch(visitDraftCountProvider).valueOrNull ?? 0
        : 0;
    final icon = Icon(item.icon);
    final selectedIcon = Icon(item.selectedIcon);
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

  String _pageTitle(String path, {required bool isOwner}) {
    if (path == '/' || path == '/kunjungan/:id') {
      return 'Tempatkan Kopi';
    }
    if (path == '/beranda') {
      return isOwner ? 'Dashboard Owner' : 'Beranda';
    }
    if (path.startsWith('/kunjungan/')) {
      return 'Kunjungan';
    }
    if (path == '/kunjungan') return 'Riwayat Kunjungan';
    if (path == '/kunjungan/success') return 'Kunjungan Berhasil';
    if (path.startsWith('/warung/')) {
      return path.endsWith('/form') ? 'Tambah Warung' : 'Detail Warung';
    }
    if (path == '/warung') return 'Warung';
    if (path == '/produk') return 'Produk';
    if (path == '/profil') return 'Profil';
    if (path == '/master' || path == '/master/produk' || path == '/master/bahan' || path == '/master/warung') {
      if (path == '/master/bahan') return 'Bahan Baku';
      if (path == '/master/warung') return 'Warung';
      if (path == '/master/produk') return 'Produk';
      return 'Master Data';
    }
    if (path == '/master/produk/form') return 'Tambah Produk';
    if (path == '/admin') return 'Panel Admin';
    if (path == '/laporan') return 'Laporan Keuangan';
    if (path == '/pengguna') return 'Pengguna';
    if (path == '/pengaturan') return 'Pengaturan Aplikasi';
    return '';
  }
}

class _KonsiTopBar extends StatelessWidget {
  const _KonsiTopBar({
    required this.title,
    required this.subtitle,
    required this.onMenuPressed,
  });

  final String title;
  final String subtitle;
  final VoidCallback onMenuPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(
        top: 12,
        left: 16,
        right: 16,
        bottom: 12,
      ),
      decoration: BoxDecoration(
        color: KonsiColors.coffeeCream,
        border: Border(
          bottom: BorderSide(color: KonsiColors.coffeeMilk.withOpacity(0.6)),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: KonsiColors.darkCoffee,
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: const Text(
                'K',
                style: TextStyle(
                  color: KonsiColors.coffeeWhite,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: KonsiColors.espresso,
                          fontWeight: FontWeight.bold,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: KonsiColors.mediumCoffee,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ],
              ),
            ),
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onMenuPressed,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.menu,
                    color: KonsiColors.mediumCoffee,
                  ),
                ),
              ),
            ),
          ],
        ),
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
      return Container(
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

class _MenuDrawer extends StatelessWidget {
  const _MenuDrawer({
    required this.role,
    required this.currentPath,
    required this.onLogout,
  });

  final String? role;
  final String currentPath;
  final VoidCallback onLogout;

  bool get _isOwner => role == 'owner';

  List<_MenuItem> get _items {
    if (_isOwner) {
      return const [
        _MenuItem(label: 'Profil', icon: Icons.person_outline, path: '/profil'),
        _MenuItem(label: 'Admin', icon: Icons.shield_outlined, path: '/admin'),
        _MenuItem(label: 'Analitik', icon: Icons.analytics_outlined, path: '/analytics'),
        _MenuItem(label: 'Laporan', icon: Icons.file_download_outlined, path: '/laporan'),
        _MenuItem(label: 'Pengguna', icon: Icons.people_outline, path: '/pengguna'),
        _MenuItem(
          label: 'Pengaturan',
          icon: Icons.settings_outlined,
          path: '/pengaturan',
        ),
      ];
    }
    return const [
      _MenuItem(label: 'Profil', icon: Icons.person_outline, path: '/profil'),
    ];
  }

  bool _isActive(String path) {
    return currentPath == path || (path != '/' && currentPath.startsWith(path));
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: KonsiColors.coffeeCream,
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: KonsiColors.darkCoffee,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'K',
                      style: TextStyle(
                        color: KonsiColors.coffeeWhite,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Konsi',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: KonsiColors.espresso,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        Text(
                          _isOwner ? 'Owner' : 'Staff Lapangan',
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: _items.length,
                itemBuilder: (context, index) {
                  final item = _items[index];
                  final active = _isActive(item.path);
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: ListTile(
                      leading: Icon(
                        item.icon,
                        color: active ? KonsiColors.coffeeWhite : KonsiColors.mediumCoffee,
                      ),
                      title: Text(
                        item.label,
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: active ? KonsiColors.coffeeWhite : KonsiColors.espresso,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
                      ),
                      tileColor: active ? KonsiColors.darkCoffee : Colors.transparent,
                      onTap: () {
                        Navigator.of(context).pop();
                        if (currentPath != item.path) {
                          context.go(item.path);
                        }
                      },
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: ListTile(
                leading: const Icon(Icons.logout, color: KonsiColors.berry),
                title: Text(
                  'Keluar',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: KonsiColors.berry,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(KonsiShapes.radiusMd),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  onLogout();
                },
              ),
            ),
          ],
        ),
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

class _MenuItem {
  const _MenuItem({
    required this.label,
    required this.icon,
    required this.path,
  });

  final String label;
  final IconData icon;
  final String path;
}
