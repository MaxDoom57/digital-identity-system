import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

/// Handles citizen login, logout, and cached session data.
class AuthService {
  AuthService._();

  static const String _citizenPrefKey = 'citizen_data';

  // ── Login ─────────────────────────────────────────────────────────────────
  /// POST /api/citizen/login  →  stores JWT + caches citizen info.
  /// Returns the citizen map from the backend on success.
  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    final data = await ApiService.post('/api/citizen/login', {
      'email': email.trim(),
      'password': password,
    });

    // Persist token securely
    await ApiService.saveToken(data['token'] as String);

    // Cache basic citizen info for quick offline reads
    final citizen = data['citizen'] as Map<String, dynamic>;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_citizenPrefKey, jsonEncode(citizen));

    return citizen;
  }

  // ── Session helpers ───────────────────────────────────────────────────────
  static Future<bool> isLoggedIn() async {
    final token = await ApiService.getToken();
    return token != null && token.isNotEmpty;
  }

  /// Returns the last cached citizen object (from SharedPreferences).
  /// Used by screens that need quick access without an API round-trip.
  static Future<Map<String, dynamic>?> getCachedCitizen() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_citizenPrefKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  /// Persists updated citizen fields back to the local cache.
  static Future<void> updateCachedCitizen(
      Map<String, dynamic> citizen) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_citizenPrefKey, jsonEncode(citizen));
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  static Future<void> logout() async {
    await ApiService.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_citizenPrefKey);
  }
}
