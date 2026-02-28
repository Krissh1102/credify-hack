import 'package:flutter/material.dart';
import 'package:mobile/services/transaction_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class TransactionProvider extends ChangeNotifier {
  final TransactionService _service = TransactionService.instance;
  static SupabaseClient get _db => Supabase.instance.client;

  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> _transactions = [];
  List<Map<String, dynamic>> _incomeTransactions = [];
  List<Map<String, dynamic>> _expenseTransactions = [];

  bool get isLoading => _isLoading;
  String? get error => _error;
  List<Map<String, dynamic>> get transactions => _transactions;
  List<Map<String, dynamic>> get incomeTransactions => _incomeTransactions;
  List<Map<String, dynamic>> get expenseTransactions => _expenseTransactions;

  // ── Resolve Clerk ID → internal UUID ──────────────────────────
  Future<String?> _resolveInternalId(String clerkUserId) async {
    if (clerkUserId.isEmpty) return null;
    final rows = await _db
        .from('users')
        .select('id')
        .eq('clerkUserId', clerkUserId)
        .limit(1);
    if ((rows as List).isEmpty) return null;
    return (rows.first as Map<String, dynamic>)['id'] as String?;
  }

  // ── Load all transactions ──────────────────────────────────────
  Future<void> loadTransactions({String? clerkUserId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String? internalId;
      if (clerkUserId != null && clerkUserId.isNotEmpty) {
        internalId = await _resolveInternalId(clerkUserId);
      }

      final all = internalId != null
          ? await _service.getTransactionsByUser(internalId)
          : <Map<String, dynamic>>[];

      _transactions = all;
      _incomeTransactions =
          all.where((t) => (t['type'] as String?) == 'INCOME').toList();
      _expenseTransactions =
          all.where((t) => (t['type'] as String?) == 'EXPENSE').toList();
    } catch (e) {
      _error = e.toString();
      debugPrint('❌ loadTransactions error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Create transaction ────────────────────────────────────────
  Future<bool> createTransaction({
    required String clerkUserId,
    required String accountId,
    required String type,       // 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT'
    required double amount,
    required String category,
    required String date,       // ✅ Already ISO8601 from scan_screen.dart — do NOT re-parse
    String description = '',
    bool isRecurring = false,
    String? recurringInterval,
    DateTime? nextRecurringDate,
    String? receiptUrl,
  }) async {
    try {
      final internalId = await _resolveInternalId(clerkUserId);
      if (internalId == null) {
        debugPrint('❌ createTransaction: could not resolve internal user ID for $clerkUserId');
        return false;
      }

      if (accountId.isEmpty) {
        debugPrint('❌ createTransaction: accountId is empty');
        return false;
      }

      // ✅ date is already ISO8601 — just ensure it ends with Z for Supabase
      final isoDate = _normalizeIsoDate(date);

      debugPrint('🔍 createTransaction:');
      debugPrint('  internalUserId : $internalId');
      debugPrint('  accountId      : $accountId');
      debugPrint('  type           : $type');
      debugPrint('  amount         : $amount');
      debugPrint('  category       : $category');
      debugPrint('  date (iso)     : $isoDate');
      debugPrint('  description    : $description');
      debugPrint('  isRecurring    : $isRecurring');

      final result = await _service.createTransaction(
        userId: internalId,
        accountId: accountId,
        type: type,
        amount: amount,
        category: category,
        date: isoDate,
        description: description,
        isRecurring: isRecurring,
        recurringInterval: isRecurring ? (recurringInterval ?? 'MONTHLY') : null,
        nextRecurringDate: nextRecurringDate,
        receiptUrl: receiptUrl,
      );

      if (result != null) {
        // Optimistically prepend to the right list
        _transactions.insert(0, result);
        if (type == 'INCOME') {
          _incomeTransactions.insert(0, result);
        } else if (type == 'EXPENSE') {
          _expenseTransactions.insert(0, result);
        }
        notifyListeners();
        debugPrint('✅ Transaction created: ${result['id']}');
        return true;
      }

      debugPrint('❌ createTransaction: service returned null');
      return false;
    } catch (e) {
      _error = e.toString();
      debugPrint('❌ createTransaction error: $e');
      notifyListeners();
      return false;
    }
  }

  /// Ensures the ISO date string is in a format Supabase accepts.
  /// Handles both:
  ///   2026-02-28T00:00:00.000     → 2026-02-28T00:00:00.000Z
  ///   2026-02-28T00:00:00.000Z    → unchanged
  String _normalizeIsoDate(String date) {
    if (date.isEmpty) return DateTime.now().toUtc().toIso8601String();
    try {
      final d = DateTime.parse(date);
      return d.toUtc().toIso8601String(); 
    } catch (_) {
      debugPrint('⚠️ Could not parse date "$date", using now');
      return DateTime.now().toUtc().toIso8601String();
    }
  }

  Future<void> refresh({String? clerkUserId}) =>
      loadTransactions(clerkUserId: clerkUserId);
}