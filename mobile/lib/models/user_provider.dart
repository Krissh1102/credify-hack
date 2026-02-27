import 'package:flutter/material.dart';
import 'package:mobile/services/clerk_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// ═══════════════════════════════════════════════════════════════
// USER MODEL
// ═══════════════════════════════════════════════════════════════
class AppUser {
  final String id;
  final String clerkUserId;
  final String email;
  final String name;
  final String? imageUrl;

  const AppUser({
    required this.id,
    required this.clerkUserId,
    required this.email,
    required this.name,
    this.imageUrl,
  });

  /// First letter of first name, uppercased — for avatar fallback
  String get initial =>
      name.isNotEmpty ? name.trim()[0].toUpperCase() : email[0].toUpperCase();

  /// First name only
  String get firstName => name.split(' ').first;

  factory AppUser.fromMap(Map<String, dynamic> m) => AppUser(
        id: m['id'] as String,
        clerkUserId: m['clerkUserId'] as String? ?? '',
        email: m['email'] as String? ?? '',
        name: m['name'] as String? ?? '',
        imageUrl: m['imageUrl'] as String?,
      );
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNT MODEL
// ═══════════════════════════════════════════════════════════════
class Account {
  final String id;
  final String name;
  final String type;
  final double balance;
  final bool isDefault;
  final String userId;

  const Account({
    required this.id,
    required this.name,
    required this.type,
    required this.balance,
    required this.isDefault,
    required this.userId,
  });

  factory Account.fromMap(Map<String, dynamic> m) => Account(
        id: m['id'] as String,
        name: m['name'] as String? ?? '',
        type: m['type'] as String? ?? '',
        balance: (m['balance'] as num?)?.toDouble() ?? 0.0,
        isDefault: m['isDefault'] as bool? ?? false,
        userId: m['userId'] as String? ?? '',
      );
}

// ═══════════════════════════════════════════════════════════════
// USER PROVIDER — InheritedNotifier wrapper
// ═══════════════════════════════════════════════════════════════
class UserProvider extends InheritedNotifier<UserNotifier> {
  const UserProvider({
    super.key,
    required UserNotifier notifier,
    required super.child,
  }) : super(notifier: notifier);

  static UserNotifier of(BuildContext context) {
    final provider =
        context.dependOnInheritedWidgetOfExactType<UserProvider>();
    assert(provider != null, 'No UserProvider found in context');
    return provider!.notifier!;
  }
}

// ═══════════════════════════════════════════════════════════════
// USER NOTIFIER — holds state, loads from Supabase
// ═══════════════════════════════════════════════════════════════
class UserNotifier extends ChangeNotifier {
  static final UserNotifier _instance = UserNotifier._();
  factory UserNotifier() => _instance;
  UserNotifier._();

  static SupabaseClient get _db => Supabase.instance.client;

  AppUser? _user;
  List<Account> _accounts = [];
  bool _loading = false;
  String? _error;

  AppUser? get user => _user;
  List<Account> get accounts => _accounts;
  bool get loading => _loading;
  String? get error => _error;

  /// Default account (isDefault=true), or first account, or null
  Account? get defaultAccount =>
      _accounts.isEmpty
          ? null
          : _accounts.firstWhere(
              (a) => a.isDefault,
              orElse: () => _accounts.first,
            );

  /// Total balance across all accounts
  double get totalBalance =>
      _accounts.fold(0.0, (sum, a) => sum + a.balance);

  /// Greeting based on current hour
  String get greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }

  // ─── Load user data from Supabase ─────────────────────────────
  Future<void> load() async {
    if (_loading) return;

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      // ✅ Grab the user ID instantly from the Clerk SDK
      final userId = ClerkAuthService.currentUserId;
      
      if (userId == null) {
        _error = 'Not authenticated';
        return;
      }

      // Fetch user row
      final userRow = await _db
          .from('users')
          .select()
          .eq('id', userId)
          .maybeSingle();

      if (userRow != null) {
        _user = AppUser.fromMap(userRow);
      }

      // Fetch accounts for this user
      final accountRows = await _db
          .from('accounts')
          .select()
          .eq('userId', userId)
          .order('isDefault', ascending: false); // default first

      _accounts = (accountRows as List)
          .map((r) => Account.fromMap(r as Map<String, dynamic>))
          .toList();

    } on PostgrestException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void clear() {
    _user = null;
    _accounts = [];
    _error = null;
    _loading = false;
    notifyListeners();
  }
}