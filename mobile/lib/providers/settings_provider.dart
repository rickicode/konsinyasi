import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:konsi_mobile/config/api_config.dart';
import 'package:konsi_mobile/providers/auth_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _baseUrlKey = 'konsi_api_base_url';


/// Baca base URL tersimpan dan terapkan ke ApiConfig saat startup.
/// Cocok dipanggil sebelum runApp agar Dio pertama pakai URL yang benar.
Future<void> initializeBaseUrlFromPreferences() async {
  final prefs = await SharedPreferences.getInstance();
  final saved = prefs.getString(_baseUrlKey);
  if (saved != null && saved.isNotEmpty) {
    ApiConfig.setBaseUrl(saved);
  }
}
/// Snapshot pengaturan aplikasi yang dipersistensi lokal.
class AppSettings {
  const AppSettings({required this.baseUrl});

  final String baseUrl;

  AppSettings copyWith({String? baseUrl}) {
    return AppSettings(
      baseUrl: baseUrl ?? this.baseUrl,
    );
  }
}

final settingsProvider = AsyncNotifierProvider<SettingsNotifier, AppSettings>(
  SettingsNotifier.new,
);

class SettingsNotifier extends AsyncNotifier<AppSettings> {
  @override
  Future<AppSettings> build() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_baseUrlKey);
    final baseUrl = saved?.isNotEmpty == true ? saved! : ApiConfig.baseUrl;
    return AppSettings(baseUrl: baseUrl);
  }

  /// Perbarui base URL dan invalidasi semua provider yang bergantung pada Dio.
  Future<void> updateBaseUrl(String url) async {
    final trimmed = url.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('URL tidak boleh kosong');
    }

    String normalized = trimmed;
    if (normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }

    final uri = Uri.tryParse(normalized);
    if (uri == null || !uri.isAbsolute || !(uri.scheme == 'http' || uri.scheme == 'https')) {
      throw ArgumentError('URL harus valid dan menggunakan http/https');
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, normalized);

    ApiConfig.setBaseUrl(normalized);

    // Paksa recreate Dio instance + semua API providers downstream.
    ref.invalidate(dioProvider);

    state = AsyncValue.data(AppSettings(baseUrl: normalized));
  }

  /// Kembalikan ke default compile-time/dart-define.
  Future<void> resetBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_baseUrlKey);

    ApiConfig.resetBaseUrl();
    ref.invalidate(dioProvider);

    state = AsyncValue.data(AppSettings(baseUrl: ApiConfig.baseUrl));
  }
}
