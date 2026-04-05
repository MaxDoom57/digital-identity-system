import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'theme/app_theme.dart';
import 'screens/splash_screen.dart';
import 'screens/welcome_screen.dart';
import 'screens/biometric_auth_screen.dart';
import 'screens/home_screen.dart';
import 'screens/digital_id_screen.dart';
import 'screens/consent_screen.dart';
import 'screens/qr_token_screen.dart';
import 'screens/history_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait orientation
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Status bar style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const SLDigitalIDApp());
}

class SLDigitalIDApp extends StatelessWidget {
  const SLDigitalIDApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SL Digital ID',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      initialRoute: AppRoutes.splash,
      routes: {
        AppRoutes.splash:        (_) => const SplashScreen(),
        AppRoutes.welcome:       (_) => const WelcomeScreen(),
        AppRoutes.biometricAuth: (_) => const BiometricAuthScreen(),
        AppRoutes.home:          (_) => const HomeScreen(),
        AppRoutes.digitalId:     (_) => const DigitalIdScreen(),
        AppRoutes.consent:       (_) => const ConsentScreen(),
        AppRoutes.qrToken:       (_) => const QrTokenScreen(),
        AppRoutes.history:       (_) => const HistoryScreen(),
      },
    );
  }
}

/// Centralised route name constants
class AppRoutes {
  AppRoutes._();

  static const String splash        = '/';
  static const String welcome       = '/welcome';
  static const String biometricAuth = '/auth/biometric';
  static const String home          = '/home';
  static const String digitalId     = '/digital-id';
  static const String consent       = '/consent';
  static const String qrToken       = '/qr-token';
  static const String history       = '/history';
}
