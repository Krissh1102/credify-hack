import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:http/http.dart' as http;

class ClerkAuthService {
  static const String _frontendApi =
      'https://intense-haddock-31.clerk.accounts.dev';
  static const _storage = FlutterSecureStorage();

  static const _sessionTokenKey = 'clerk_session_token';
  static const _sessionIdKey = 'clerk_session_id';
  static const _clientIdKey = 'clerk_client_id';

  // // Your Web Client ID from Google Cloud Console
  // static final _googleSignIn = GoogleSignIn(
  //   serverClientId:
  //       'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  //   scopes: ['email', 'profile'],
  // );

  // ─── Email/Password Sign In (existing) ────────────────────────
  static Future<String?> signIn(String email, String password) async {
    try {
      final createRes = await http.post(
        Uri.parse('$_frontendApi/v1/client/sign_ins'),
        headers: _headers(),
        body: jsonEncode({'identifier': email}),
      );

      final createBody = jsonDecode(createRes.body) as Map<String, dynamic>;
      if (createRes.statusCode != 200) return _extractError(createBody);

      final signInId = createBody['response']['id'] as String;
      final clientId = createBody['client']['id'] as String;

      final attemptRes = await http.post(
        Uri.parse(
          '$_frontendApi/v1/client/sign_ins/$signInId/attempt_first_factor',
        ),
        headers: _headers(),
        body: jsonEncode({'strategy': 'password', 'password': password}),
      );

      final attemptBody = jsonDecode(attemptRes.body) as Map<String, dynamic>;
      if (attemptRes.statusCode != 200) return _extractError(attemptBody);

      final status = attemptBody['response']['status'] as String?;
      if (status != 'complete') {
        return 'Additional verification required (status: $status)';
      }

      return await _persistSession(attemptBody, clientId);
    } catch (e) {
      return 'Unexpected error: $e';
    }
  }

  // // ─── Google Sign In ───────────────────────────────────────────
  // static Future<String?> signInWithGoogle() async {
  //   try {
  //     // Step 1: Trigger native Google sign-in to get ID token
  //     final googleUser = await _googleSignIn.signIn();
  //     if (googleUser == null) return 'Google sign-in cancelled';

  //     final googleAuth = await googleUser.authentication;
  //     final idToken = googleAuth.idToken;
  //     if (idToken == null) return 'Failed to get Google ID token';

  //     // Step 2: Create Clerk sign-in with Google token
  //     final createRes = await http.post(
  //       Uri.parse('$_frontendApi/v1/client/sign_ins'),
  //       headers: _headers(),
  //       body: jsonEncode({
  //         'strategy': 'oauth_google',
  //         'redirect_url': '$_frontendApi/v1/oauth_callback',
  //       }),
  //     );

  //     final createBody = jsonDecode(createRes.body) as Map<String, dynamic>;
  //     if (createRes.statusCode != 200) return _extractError(createBody);

  //     final signInId = createBody['response']['id'] as String;
  //     final clientId = createBody['client']['id'] as String;

  //     // Step 3: Attempt with the ID token
  //     final attemptRes = await http.post(
  //       Uri.parse('$_frontendApi/v1/client/sign_ins/$signInId/attempt_first_factor'),
  //       headers: _headers(),
  //       body: jsonEncode({
  //         'strategy': 'oauth_google',
  //         'token': idToken,
  //       }),
  //     );

  //     final attemptBody = jsonDecode(attemptRes.body) as Map<String, dynamic>;
  //     if (attemptRes.statusCode != 200) return _extractError(attemptBody);

  //     final status = attemptBody['response']['status'] as String?;
  //     if (status != 'complete') {
  //       return 'Google auth incomplete (status: $status)';
  //     }

  //     return await _persistSession(attemptBody, clientId);
  //   } catch (e) {
  //     return 'Google sign-in error: $e';
  //   }
  // }

  // ─── Sign Out ─────────────────────────────────────────────────
  static Future<void> signOut() async {
    try {
      final sessionId = await _storage.read(key: _sessionIdKey);
      final token = await _storage.read(key: _sessionTokenKey);

      if (sessionId != null && token != null) {
        await http.delete(
          Uri.parse('$_frontendApi/v1/client/sessions/$sessionId'),
          headers: _headers(token: token),
        );
      }
      // await _googleSignIn.signOut(); // also clear Google session
    } catch (_) {
    } finally {
      await _storage.deleteAll();
    }
  }

  // ─── Shared session persistence ───────────────────────────────
  static Future<String?> _persistSession(
    Map<String, dynamic> body,
    String clientId,
  ) async {
    final sessions = body['client']['sessions'] as List<dynamic>;
    if (sessions.isEmpty) return 'No session returned from Clerk';

    final session = sessions.first as Map<String, dynamic>;
    final sessionId = session['id'] as String;
    final sessionToken = session['last_active_token']?['jwt'] as String? ?? '';

    await _storage.write(key: _sessionTokenKey, value: sessionToken);
    await _storage.write(key: _sessionIdKey, value: sessionId);
    await _storage.write(key: _clientIdKey, value: clientId);

    return null; // success
  }

  static Future<String?> getSessionToken() =>
      _storage.read(key: _sessionTokenKey);

  static Future<bool> isSignedIn() async {
    final token = await _storage.read(key: _sessionTokenKey);
    return token != null && token.isNotEmpty;
  }

  static Map<String, String> _headers({String? token}) => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  static String _extractError(Map<String, dynamic> body) {
    final errors = body['errors'] as List<dynamic>?;
    if (errors != null && errors.isNotEmpty) {
      final first = errors.first as Map<String, dynamic>;
      return first['long_message'] as String? ??
          first['message'] as String? ??
          'Unknown error';
    }
    return body['message'] as String? ?? 'Unknown error';
  }
}
