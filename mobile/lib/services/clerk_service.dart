import 'dart:io';
import 'package:clerk_auth/clerk_auth.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide User;

class ClerkAuthService {
  static SupabaseClient get _db => Supabase.instance.client;
  
  // Singleton instance for the Clerk Auth SDK
  static late Auth _auth;
  static Auth get auth => _auth;

  /// ─── Initialization ─────────────────────────────────────────────
  /// Call this once in your main.dart before runApp()
  static Future<void> init(String publishableKey) async {
    // 1. Get a safe local directory for Flutter to store session data
    final directory = await getApplicationDocumentsDirectory();

    // 2. Initialize Auth with the required Persistor
    _auth = Auth(
      config: AuthConfig(
        publishableKey: publishableKey,
        persistor: DefaultPersistor(
          getCacheDirectory: () => directory,
        ),
      ),
    );
    await _auth.initialize();
  }

  // ─── Sign In ───────────────────────────────────────────────────
  static Future<String?> signIn(String email, String password) async {
    try {
      await _auth.attemptSignIn(
        strategy: Strategy.password,
        identifier: email,
        password: password,
      );

      final user = _auth.user;
      if (user == null) {
        return 'Additional verification required (status incomplete)';
      }

      // Sync user to Supabase (best-effort, non-blocking)
      await _upsertUserToSupabase(user, email);
      return null; // ✅ success
      
    } on AuthError catch (e) {
      return e.message;
    } catch (e) {
      return 'Unexpected error: $e';
    }
  }

  // ─── Upsert user into Supabase `users` table ──────────────────
  static Future<void> _upsertUserToSupabase(User clerkUser, String email) async {
    try {
      final firstName = clerkUser.firstName ?? '';
      final lastName = clerkUser.lastName ?? '';
      final fullName = '$firstName $lastName'.trim();
      final imageUrl = clerkUser.imageUrl;
      
      // `clerkUser.id` is the stable Clerk user UUID
      final userId = clerkUser.id; 

      await _db.from('users').upsert({
        'id': userId,
        'clerkUserId': userId,
        'email': email,
        'name': fullName.isNotEmpty ? fullName : email.split('@').first,
        if (imageUrl != null && imageUrl.isNotEmpty) 'imageUrl': imageUrl,
      }, onConflict: 'id');
      
    } on PostgrestException catch (e) {
      print('[ClerkAuthService] Supabase upsert failed: ${e.message}');
    } catch (e) {
      print('[ClerkAuthService] Supabase upsert error: $e');
    }
  }

  // ─── Sign Out ──────────────────────────────────────────────────
  static Future<void> signOut() async {
    try {
      await _auth.signOut();
    } catch (e) {
      print('[ClerkAuthService] Sign out error: $e');
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────
  
  /// Get the current user's stable Clerk ID
  static String? get currentUserId => _auth.user?.id;

  /// Get the current active session JWT token
  static Future<SessionToken> getSessionToken() async {
    return await _auth.sessionToken(); 
  }

  /// Check if the user is currently signed in
  static bool isSignedIn() {
    return _auth.user != null;
  }
}