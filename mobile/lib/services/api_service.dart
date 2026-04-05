import 'dart:async';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Custom exception for API errors
class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Central HTTP client — injects JWT automatically on every request.
/// All screens and services call only this class, never `http` directly.
class ApiService {
  ApiService._();

  // ── Configuration ────────────────────────────────────────────────────────
  static const String baseUrl = 'http://192.168.43.212:3001';
  static const Duration _timeout = Duration(seconds: 20);
  static const String _tokenKey = 'citizen_jwt';
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  // ── Token helpers ─────────────────────────────────────────────────────────
  static Future<String?> getToken() => _storage.read(key: _tokenKey);

  static Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  static Future<void> clearToken() => _storage.delete(key: _tokenKey);

  // ── Header builder ────────────────────────────────────────────────────────
  static Future<Map<String, String>> _headers() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  // ── HTTP verbs ────────────────────────────────────────────────────────────
  static Future<dynamic> get(String path) async {
    final response = await http
        .get(Uri.parse('$baseUrl$path'), headers: await _headers())
        .timeout(_timeout);
    return _handle(response);
  }

  static Future<dynamic> post(String path,
      [Map<String, dynamic>? body]) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl$path'),
          headers: await _headers(),
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(_timeout);
    return _handle(response);
  }

  static Future<dynamic> put(String path,
      [Map<String, dynamic>? body]) async {
    final response = await http
        .put(
          Uri.parse('$baseUrl$path'),
          headers: await _headers(),
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(_timeout);
    return _handle(response);
  }

  // ── Response handler ──────────────────────────────────────────────────────
  static dynamic _handle(http.Response response) {
    dynamic body;
    try {
      body = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (_) {
      body = {'error': 'Invalid response from server'};
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    final msg = (body is Map ? body['error'] : null) ?? 'Request failed';
    throw ApiException(response.statusCode, msg.toString());
  }
}
