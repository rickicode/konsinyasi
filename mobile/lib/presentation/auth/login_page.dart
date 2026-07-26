import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:konsi_mobile/config/constants.dart';
import 'package:konsi_mobile/config/theme.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final success = await ref.read(authNotifierProvider.notifier).login(
          username: _usernameController.text.trim(),
          password: _passwordController.text,
        );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        context.go('/');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final theme = Theme.of(context);

    ref.listen(authNotifierProvider, (_, next) {
      if (next.error != null && next.error!.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: KonsiColors.berry,
            content: Text(next.error!),
          ),
        );
        ref.read(authNotifierProvider.notifier).clearError();
      }
    });

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(KonsiConstants.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),
              Center(
                child: CircleAvatar(
                  radius: 48,
                  backgroundColor: KonsiColors.coffeeMilk,
                  child: Icon(
                    Icons.local_cafe_rounded,
                    size: 48,
                    color: KonsiColors.caramel,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Text(
                  'Konsi',
                  style: theme.textTheme.displayLarge?.copyWith(
                    color: KonsiColors.espresso,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Manajemen Konsinyasi Kopi Susu Botolan',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: KonsiColors.mediumCoffee,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 48),
              Text(
                'Masuk',
                style: theme.textTheme.displayMedium,
              ),
              const SizedBox(height: 4),
              Text(
                'Masukkan username dan password Anda',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: KonsiColors.lightCoffee,
                ),
              ),
              const SizedBox(height: 24),
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextFormField(
                      controller: _usernameController,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Username',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Username wajib diisi';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Password wajib diisi';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: KonsiConstants.minTapTarget,
                      child: ElevatedButton(
                        onPressed: _isSubmitting || authState.isLoading
                            ? null
                            : _submit,
                        child: _isSubmitting || authState.isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: KonsiColors.coffeeWhite,
                                ),
                              )
                            : const Text('Masuk'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Text(
                  '© 2026 Konsi',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: KonsiColors.lightCoffee,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
