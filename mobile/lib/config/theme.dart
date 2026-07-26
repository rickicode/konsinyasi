import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Konsi coffee-inspired color palette.
class KonsiColors {
  KonsiColors._();

  // Primary coffee
  static const Color espresso = Color(0xFF3E2723);
  static const Color darkCoffee = Color(0xFF4E342E);
  static const Color mediumCoffee = Color(0xFF6D4C41);
  static const Color lightCoffee = Color(0xFF8D6E63);
  static const Color coffeeMilk = Color(0xFFD7CCC8);
  static const Color coffeeFoam = Color(0xFFEFEBE9);
  static const Color coffeeCream = Color(0xFFF5F0EB);
  static const Color coffeeWhite = Color(0xFFFFFFFF);

  // Accents
  static const Color caramel = Color(0xFFC67C4E);
  static const Color honey = Color(0xFFE6AA68);

  // Semantic
  static const Color mintLeaf = Color(0xFF66BB6A);
  static const Color lemon = Color(0xFFFDD835);
  static const Color berry = Color(0xFFE53935);

  // Soft backgrounds
  static const Color roseSoft = Color(0xFFFFCDD2);
  static const Color matchaSoft = Color(0xFFC8E6C9);
  static const Color lemonSoft = Color(0xFFFFFDE7);
}

/// Status colors for consignment stock age.
class StockStatusColors {
  StockStatusColors._();

  static const Color green = KonsiColors.mintLeaf;
  static const Color yellow = KonsiColors.lemon;
  static const Color red = KonsiColors.berry;
  static const Color none = KonsiColors.mediumCoffee;

  static Color background(String color) {
    return switch (color) {
      'red' => KonsiColors.roseSoft,
      'yellow' => KonsiColors.lemonSoft,
      'green' => KonsiColors.matchaSoft,
      _ => KonsiColors.coffeeFoam,
    };
  }

  static Color foreground(String color) {
    return switch (color) {
      'red' => KonsiColors.berry,
      'yellow' => KonsiColors.lemon,
      'green' => KonsiColors.mintLeaf,
      _ => KonsiColors.mediumCoffee,
    };
  }
}

/// Typography configuration.
class KonsiTypography {
  KonsiTypography._();

  static TextTheme get textTheme {
    final base = GoogleFonts.robotoTextTheme();
    return base.copyWith(
      displayLarge: GoogleFonts.roboto(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: KonsiColors.espresso,
      ),
      displayMedium: GoogleFonts.roboto(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: KonsiColors.espresso,
      ),
      displaySmall: GoogleFonts.roboto(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: KonsiColors.espresso,
      ),
      bodyLarge: GoogleFonts.roboto(
        fontSize: 16,
        fontWeight: FontWeight.normal,
        color: KonsiColors.darkCoffee,
      ),
      bodyMedium: GoogleFonts.roboto(
        fontSize: 14,
        fontWeight: FontWeight.normal,
        color: KonsiColors.darkCoffee,
      ),
      bodySmall: GoogleFonts.roboto(
        fontSize: 12,
        fontWeight: FontWeight.normal,
        color: KonsiColors.lightCoffee,
      ),
      labelLarge: GoogleFonts.roboto(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: KonsiColors.espresso,
      ),
    );
  }
}

/// Shape tokens.
class KonsiShapes {
  KonsiShapes._();

  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusXl = 24;

  static BorderRadius get small => BorderRadius.circular(radiusSm);
  static BorderRadius get medium => BorderRadius.circular(radiusMd);
  static BorderRadius get large => BorderRadius.circular(radiusLg);
  static BorderRadius get xlarge => BorderRadius.circular(radiusXl);

  static RoundedRectangleBorder cardShape = RoundedRectangleBorder(
    borderRadius: medium,
  );
}

/// Complete Material 3 theme.
ThemeData buildKonsiTheme({required Brightness brightness}) {
  final isDark = brightness == Brightness.dark;
  final colorScheme = ColorScheme.fromSeed(
    seedColor: KonsiColors.caramel,
    primary: KonsiColors.caramel,
    secondary: KonsiColors.mediumCoffee,
    surface: isDark ? KonsiColors.espresso : KonsiColors.coffeeCream,
    surfaceContainerHighest: isDark ? KonsiColors.darkCoffee : KonsiColors.coffeeFoam,
    onSurface: isDark ? KonsiColors.coffeeCream : KonsiColors.espresso,
    error: KonsiColors.berry,
    brightness: brightness,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: colorScheme.surface,
    textTheme: KonsiTypography.textTheme,
    cardTheme: CardTheme(
      elevation: 2,
      shape: KonsiShapes.cardShape,
      color: KonsiColors.coffeeWhite,
      margin: const EdgeInsets.all(0),
    ),
    appBarTheme: AppBarTheme(
      centerTitle: true,
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      elevation: 0,
      titleTextStyle: KonsiTypography.textTheme.displayMedium,
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: colorScheme.surface,
      selectedItemColor: KonsiColors.caramel,
      unselectedItemColor: KonsiColors.mediumCoffee,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: KonsiColors.caramel,
      foregroundColor: KonsiColors.coffeeWhite,
      shape: StadiumBorder(),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: KonsiColors.caramel,
        foregroundColor: KonsiColors.coffeeWhite,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: KonsiShapes.medium),
        textStyle: KonsiTypography.textTheme.labelLarge?.copyWith(
          color: KonsiColors.coffeeWhite,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: KonsiColors.caramel,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: KonsiShapes.medium),
        side: const BorderSide(color: KonsiColors.caramel),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: KonsiColors.coffeeFoam,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: KonsiShapes.medium,
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: KonsiShapes.medium,
        borderSide: const BorderSide(color: KonsiColors.coffeeMilk),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: KonsiShapes.medium,
        borderSide: const BorderSide(color: KonsiColors.caramel, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: KonsiShapes.medium,
        borderSide: const BorderSide(color: KonsiColors.berry),
      ),
      labelStyle: KonsiTypography.textTheme.bodyMedium,
    ),
  );
}
