/// Backend API configuration.
///
/// Override via --dart-define, e.g.:
/// flutter run --dart-define=API_BASE_URL=https://konsi.example.com/api
class ApiConfig {
  ApiConfig._();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://konsi.example.com/api',
  );

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);

  // Auth
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';

  // Dashboard
  static const String dashboard = '/dashboard';

  // Outlets
  static const String outlets = '/outlets';
  static String outletDetail(String id) => '/outlets/$id';
  static String outletPhoto(String id) => '/outlets/$id/photo';
  static String outletVisit(String id) => '/outlets/$id/visit';

  // Visits
  static const String visits = '/visits';
  static String voidVisit(String idempotencyKey) => '/visits/$idempotencyKey/void';

  // Products
  static const String products = '/products';
  static const String productsPicker = '/products/picker';
  static String productDetail(String id) => '/products/$id';

  // Raw materials
  static const String rawMaterials = '/raw-materials';

  // Settings
  static const String settings = '/settings';
  static const String settingsGeofence = '/settings/geofence';

  // Reports
  static const String reports = '/reports';
  static const String reportsExportPdf = '/reports/export.pdf';

  // Media
  static const String media = '/media';

  static void setBaseUrl(String url) {
    String normalized = url.trim();
    if (normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    baseUrl = normalized;
  }

  static void resetBaseUrl() {
    baseUrl = _defaultBaseUrl;
  }
}
