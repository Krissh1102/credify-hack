import 'package:clerk_flutter/clerk_flutter.dart';
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
      String? userId = clerkUserId;

      // If no userId passed, fall back to fetching all (dev mode)
      // In production always pass clerkUserId from the widget tree
      String? internalId;
      if (userId != null && userId.isNotEmpty) {
        internalId = await _resolveInternalId(userId);
      }

      final all = internalId != null
          ? await _service.getTransactionsByUser(internalId)
          : <Map<String, dynamic>>[];

      _transactions = all;
      // ✅ Split by the `type` column — INCOME vs EXPENSE
      _incomeTransactions = all
          .where((t) => (t['type'] as String?) == 'INCOME')
          .toList();
      _expenseTransactions = all
          .where((t) => (t['type'] as String?) == 'EXPENSE')
          .toList();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Create transaction ────────────────────────────────────────
  // Matches the Prisma model exactly:
  //   id, type, amount, description, date, category,
  //   receiptUrl, isRecurring, recurringInterval,
  //   nextRecurringDate, status
  Future<bool> createTransaction({
    required String clerkUserId,
    required String accountId,
    required String type, // 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT'
    required double amount,
    required String category,
    required String date, // dd/MM/yyyy from picker
    String description = '',
    bool isRecurring = false,
    String? recurringInterval, // 'MONTHLY' etc.
    DateTime? nextRecurringDate,
    String? receiptUrl,
  }) async {
    try {
      final internalId = await _resolveInternalId(clerkUserId);
      if (internalId == null) return false;

      // Convert dd/MM/yyyy → ISO8601 for Supabase
      final parts = date.split('/');
      final isoDate = parts.length == 3
          ? '${parts[2]}-${parts[1].padLeft(2, '0')}-${parts[0].padLeft(2, '0')}T00:00:00.000Z'
          : DateTime.now().toIso8601String();

      final result = await _service.createTransaction(
        userId: internalId,
        accountId: accountId,
        type: type,
        amount: amount,
        category: category,
        date: isoDate,
        description: description,
        isRecurring: isRecurring,
        recurringInterval: isRecurring
            ? (recurringInterval ?? 'MONTHLY')
            : null,
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
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> refresh({String? clerkUserId}) =>
      loadTransactions(clerkUserId: clerkUserId);
}
