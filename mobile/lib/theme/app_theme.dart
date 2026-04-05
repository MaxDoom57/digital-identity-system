import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// App-wide color palette — matches the SL Digital ID design system
class AppColors {
  AppColors._();

  // Primary palette
  static const Color navy        = Color(0xFF1B3A6B);
  static const Color navyDark    = Color(0xFF0F2347);
  static const Color blue        = Color(0xFF2563EB);
  static const Color teal        = Color(0xFF0D9488);
  static const Color tealLight   = Color(0xFFCCFBF1);
  static const Color gold        = Color(0xFFD97706);
  static const Color goldLight   = Color(0xFFFEF3C7);

  // Neutral palette
  static const Color offWhite    = Color(0xFFF8F9FC);
  static const Color lightGrey   = Color(0xFFE5E8EF);
  static const Color midGrey     = Color(0xFF9CA3AF);
  static const Color darkGrey    = Color(0xFF374151);
  static const Color white       = Color(0xFFFFFFFF);
  static const Color black       = Color(0xFF0A0A0A);

  // Semantic colours
  static const Color success     = Color(0xFF10B981);
  static const Color warning     = Color(0xFFF59E0B);
  static const Color error       = Color(0xFFEF4444);
  static const Color info        = Color(0xFF3B82F6);
}

/// Central theme configuration
class AppTheme {
  AppTheme._();

  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.navy,
        primary:   AppColors.navy,
        secondary: AppColors.teal,
        tertiary:  AppColors.gold,
        surface:   AppColors.white,
        error:     AppColors.error,
      ),
      scaffoldBackgroundColor: AppColors.offWhite,
      textTheme: _buildTextTheme(),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: 'Outfit',
          fontWeight: FontWeight.w600,
          fontSize: 18,
          color: AppColors.white,
          letterSpacing: 0.3,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.white,
        elevation: 2,
        shadowColor: AppColors.navy.withOpacity(0.08),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.navy,
          foregroundColor: AppColors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Outfit',
            fontWeight: FontWeight.w600,
            fontSize: 15,
            letterSpacing: 0.4,
          ),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.navy,
          minimumSize: const Size(double.infinity, 52),
          side: const BorderSide(color: AppColors.navy, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Outfit',
            fontWeight: FontWeight.w600,
            fontSize: 15,
            letterSpacing: 0.4,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.lightGrey),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.lightGrey),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.teal, width: 1.5),
        ),
        labelStyle: const TextStyle(color: AppColors.midGrey),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.lightGrey,
        thickness: 1,
        space: 1,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.white,
        selectedItemColor: AppColors.navy,
        unselectedItemColor: AppColors.midGrey,
        selectedLabelStyle: TextStyle(
          fontFamily: 'Outfit',
          fontWeight: FontWeight.w600,
          fontSize: 11,
        ),
        unselectedLabelStyle: TextStyle(
          fontFamily: 'Outfit',
          fontWeight: FontWeight.w400,
          fontSize: 11,
        ),
        elevation: 12,
        type: BottomNavigationBarType.fixed,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.tealLight,
        labelStyle: const TextStyle(
          color: AppColors.teal,
          fontFamily: 'Outfit',
          fontWeight: FontWeight.w500,
          fontSize: 12,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),
    );
  }

  static TextTheme _buildTextTheme() {
    return TextTheme(
      displayLarge: GoogleFonts.outfit(
        fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.navyDark, letterSpacing: -0.5,
      ),
      displayMedium: GoogleFonts.outfit(
        fontSize: 26, fontWeight: FontWeight.w700, color: AppColors.navyDark, letterSpacing: -0.3,
      ),
      displaySmall: GoogleFonts.outfit(
        fontSize: 22, fontWeight: FontWeight.w600, color: AppColors.navyDark,
      ),
      headlineLarge: GoogleFonts.outfit(
        fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.navy,
      ),
      headlineMedium: GoogleFonts.outfit(
        fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.navy,
      ),
      headlineSmall: GoogleFonts.outfit(
        fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.navy,
      ),
      titleLarge: GoogleFonts.outfit(
        fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.darkGrey,
      ),
      titleMedium: GoogleFonts.outfit(
        fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.darkGrey,
      ),
      titleSmall: GoogleFonts.outfit(
        fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.midGrey,
      ),
      bodyLarge: GoogleFonts.outfit(
        fontSize: 15, fontWeight: FontWeight.w400, color: AppColors.darkGrey,
      ),
      bodyMedium: GoogleFonts.outfit(
        fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.darkGrey,
      ),
      bodySmall: GoogleFonts.outfit(
        fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.midGrey,
      ),
      labelLarge: GoogleFonts.outfit(
        fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.navy,
      ),
    );
  }
}
