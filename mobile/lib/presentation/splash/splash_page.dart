import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:konsi_mobile/providers/onboarding_provider.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _decideNextRoute();
    });
  }

  Future<void> _decideNextRoute() async {
    final authAsync = ref.read(authNotifierProvider);
    final onboardingAsync = await ref.read(onboardingCompleteProvider.future);

    if (!mounted) return;

    if (!onboardingAsync) {
      context.go('/onboarding');
      return;
    }

    if (authAsync.isAuthenticated) {
      context.go('/');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: KonsiColors.espresso,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: KonsiColors.caramel.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.local_cafe,
                size: 64,
                color: KonsiColors.coffeeCream,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Konsi',
              style: TextStyle(
                color: KonsiColors.coffeeCream,
                fontSize: 32,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 12),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: KonsiColors.caramel,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
