import 'package:flutter/material.dart';
import 'package:mobile/services/transaction_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class TransactionProvider with ChangeNotifier {
  final TransactionService _service = TransactionService.instance;
  
  List<Map<String, dynamic>> _transactions = [];
  Map<String, List<Map<String, dynamic>>> _groupedTransactions = {
    'INCOME': [],
    'EXPENSE': [],
    'TRANSFER': [],
    'INVESTMENT': [],
  };
  
  bool _isLoading = false;
  String? _error;
  Map<String, double> _stats = {
    'income': 0,
    'expense': 0,
    'investment': 0,
    'balance': 0,
  };

  // Getters
  List<Map<String, dynamic>> get transactions => _transactions;
  List<Map<String, dynamic>> get incomeTransactions => _groupedTransactions['INCOME'] ?? [];
  List<Map<String, dynamic>> get expenseTransactions => _groupedTransactions['EXPENSE'] ?? [];
  List<Map<String, dynamic>> get transferTransactions => _groupedTransactions['TRANSFER'] ?? [];
  List<Map<String, dynamic>> get investmentTransactions => _groupedTransactions['INVESTMENT'] ?? [];
  Map<String, List<Map<String, dynamic>>> get groupedTransactions => _groupedTransactions;
  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, double> get stats => _stats;

  // Get current user ID
  String? get _currentUserId {
    final user = Supabase.instance.client.auth.currentUser;
    return user?.id;
  }

  // Load transactions for current user
  Future<void> loadTransactions({String? type}) async {
    if (_currentUserId == null) {
      _error = 'User not authenticated';
      notifyListeners();
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _transactions = await _service.getTransactionsByUser(
        _currentUserId!,
        type: type,
      );
      
      // Group transactions by type
      _groupedTransactions = await _service.getTransactionsGroupedByType(_currentUserId!);
      
      // Calculate stats
      _stats = await _service.getTransactionStats(_currentUserId!);
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Create a new transaction
  Future<bool> createTransaction({
    required String accountId,
    required String type,
    required double amount,
    required String category,
    required String date,
    required String description,
    required bool isRecurring,
    String? receiptUrl,
    String? recurringInterval,
    DateTime? nextRecurringDate,
  }) async {
    if (_currentUserId == null) {
      _error = 'User not authenticated';
      notifyListeners();
      return false;
    }

    try {
      final result = await _service.createTransaction(
        userId: _currentUserId!,
        accountId: accountId,
        type: type,
        amount: amount,
        category: category,
        date: date,
        description: description,
        isRecurring: isRecurring,
        receiptUrl: receiptUrl,
        recurringInterval: recurringInterval,
        nextRecurringDate: nextRecurringDate,
      );

      if (result != null) {
        // Reload transactions after creation
        await loadTransactions();
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Update a transaction
  Future<bool> updateTransaction(
    String transactionId,
    Map<String, dynamic> updates,
  ) async {
    try {
      final success = await _service.updateTransaction(transactionId, updates);
      if (success) {
        await loadTransactions();
      }
      return success;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Delete a transaction
  Future<bool> deleteTransaction(String transactionId) async {
    try {
      final success = await _service.deleteTransaction(transactionId);
      if (success) {
        await loadTransactions();
      }
      return success;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Filter transactions by type
  List<Map<String, dynamic>> getTransactionsByType(String type) {
    return _groupedTransactions[type.toUpperCase()] ?? [];
  }

  // Get transactions for a specific date range
  List<Map<String, dynamic>> getTransactionsByDateRange(
    DateTime start,
    DateTime end,
  ) {
    return _transactions.where((txn) {
      final date = DateTime.parse(txn['createdAt'] as String);
      return date.isAfter(start) && date.isBefore(end);
    }).toList();
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Refresh transactions
  Future<void> refresh() async {
    await loadTransactions();
  }
}