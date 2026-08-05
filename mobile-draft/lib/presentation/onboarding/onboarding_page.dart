import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/providers/onboarding_provider.dart';

class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  final List<_Slide> _slides = const [
    _Slide(
      icon: Icons.local_cafe_outlined,
      title: 'Selamat datang di Konsi',
      body:
          'Pantau kiriman botol susu kopi Anda ke warung-warung mitra dalam satu aplikasi.',
    ),
    _Slide(
      icon: Icons.storefront_outlined,
      title: 'Kelola Warung & Kunjungan',
      body:
          'Catat penarikan, pengisian, lokasi GPS, dan foto setiap kunjungan langsung dari ponsel.',
    ),
    _Slide(
      icon: Icons.cloud_off_outlined,
      title: 'Bekerja Meski Offline',
      body:
          'Tidak ada sinyal? Simpan kunjungan secara lokal dan biarkan aplikasi mengirimkannya saat online.',
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await completeOnboarding();
    if (!mounted) return;
    context.go('/login');
  }

  void _next() {
    if (_currentIndex < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      _finish();
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: KonsiColors.coffeeCream,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: _finish,
                child: Text(
                  'Lewati',
                  style: TextStyle(
                    color: KonsiColors.mediumCoffee,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) => setState(() => _currentIndex = index),
                itemCount: _slides.length,
                itemBuilder: (context, index) => _SlideView(
                  slide: _slides[index],
                  screenHeight: size.height,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (index) {
                      final active = index == _currentIndex;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: active ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: active
                              ? KonsiColors.caramel
                              : KonsiColors.coffeeMilk,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _next,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: KonsiColors.caramel,
                        foregroundColor: KonsiColors.coffeeCream,
                        shape: RoundedRectangleBorder(
                          borderRadius: KonsiShapes.medium,
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        _currentIndex == _slides.length - 1
                            ? 'Mulai'
                            : 'Lanjut',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Slide {
  const _Slide({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;
}

class _SlideView extends StatelessWidget {
  const _SlideView({
    required this.slide,
    required this.screenHeight,
  });

  final _Slide slide;
  final double screenHeight;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: KonsiColors.caramel.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              slide.icon,
              size: 80,
              color: KonsiColors.caramel,
            ),
          ),
          SizedBox(height: screenHeight * 0.06),
          Text(
            slide.title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: KonsiColors.espresso,
                  fontWeight: FontWeight.w800,
                  height: 1.25,
                ),
          ),
          const SizedBox(height: 16),
          Text(
            slide.body,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: KonsiColors.mediumCoffee,
                  height: 1.5,
                ),
          ),
        ],
      ),
    );
  }
}
