import 'package:supabase_flutter/supabase_flutter.dart';

class TransactionService {
  static final TransactionService instance = TransactionService._internal();
  factory TransactionService() => instance;
  TransactionService._internal();

  final _supabase = Supabase.instance.client;

  // Create a new transaction
  Future<Map<String, dynamic>?> createTransaction({
    required String userId,
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
    try {
      final response = await _supabase
          .from('transactions')
          .insert({
            'userId': userId,
            'accountId': accountId,
            'type': type,
            'amount': amount,
            'category': category,
            'date': date,
            'description': description,
            'isRecurring': isRecurring,
            'receiptUrl': receiptUrl,
            'recurringInterval': recurringInterval,
            'nextRecurringDate': nextRecurringDate?.toIso8601String(),
            'status': 'COMPLETED',
          })
          .select()
          .single();

      return response;
    } catch (e) {
      print('Error creating transaction: $e');
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> getTransactionsByUser(
    String userId, {
    String? type,
    int? limit,
  }) async {
    try {
      final builder = _supabase
          .from('transactions')
          .select()
          .eq('userId', userId);

      final filtered = type != null ? builder.eq('type', type) : builder;

      final ordered = filtered.order('createdAt', ascending: false);

      final limited = limit != null ? ordered.limit(limit) : ordered;

      final response = await limited;

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print('Error fetching transactions: $e');
      return [];
    }
  }

  Future<Map<String, List<Map<String, dynamic>>>> getTransactionsGroupedByType(
    String userId,
  ) async {
    try {
      final transactions = await getTransactionsByUser(userId);

      final Map<String, List<Map<String, dynamic>>> grouped = {
        'INCOME': [],
        'EXPENSE': [],
        'TRANSFER': [],
        'INVESTMENT': [],
      };

      for (final transaction in transactions) {
        final type = transaction['type'] as String;
        if (grouped.containsKey(type)) {
          grouped[type]!.add(transaction);
        }
      }

      return grouped;
    } catch (e) {
      print('Error grouping transactions: $e');
      return {'INCOME': [], 'EXPENSE': [], 'TRANSFER': [], 'INVESTMENT': []};
    }
  }

  // Get transactions for a specific account
  Future<List<Map<String, dynamic>>> getTransactionsByAccount(
    String accountId,
  ) async {
    try {
      final response = await _supabase
          .from('transactions')
          .select()
          .eq('accountId', accountId)
          .order('createdAt', ascending: false);

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print('Error fetching account transactions: $e');
      return [];
    }
  }

  // Update transaction
  Future<bool> updateTransaction(
    String transactionId,
    Map<String, dynamic> updates,
  ) async {
    try {
      await _supabase
          .from('transactions')
          .update(updates)
          .eq('id', transactionId);
      return true;
    } catch (e) {
      print('Error updating transaction: $e');
      return false;
    }
  }

  // Delete transaction
  Future<bool> deleteTransaction(String transactionId) async {
    try {
      await _supabase.from('transactions').delete().eq('id', transactionId);
      return true;
    } catch (e) {
      print('Error deleting transaction: $e');
      return false;
    }
  }

  // Get transaction statistics for user
  Future<Map<String, double>> getTransactionStats(String userId) async {
    try {
      final transactions = await getTransactionsByUser(userId);

      double totalIncome = 0;
      double totalExpense = 0;
      double totalInvestment = 0;

      for (final transaction in transactions) {
        final amount = (transaction['amount'] as num).toDouble();
        final type = transaction['type'] as String;

        switch (type) {
          case 'INCOME':
            totalIncome += amount;
            break;
          case 'EXPENSE':
            totalExpense += amount;
            break;
          case 'INVESTMENT':
            totalInvestment += amount;
            break;
        }
      }

      return {
        'income': totalIncome,
        'expense': totalExpense,
        'investment': totalInvestment,
        'balance': totalIncome - totalExpense - totalInvestment,
      };
    } catch (e) {
      print('Error calculating stats: $e');
      return {'income': 0, 'expense': 0, 'investment': 0, 'balance': 0};
    }
  }

  // Stream transactions for real-time updates
  Stream<List<Map<String, dynamic>>> streamTransactionsByUser(String userId) {
    return _supabase
        .from('transactions')
        .stream(primaryKey: ['id'])
        .eq('userId', userId)
        .order('createdAt', ascending: false)
        .map((data) => List<Map<String, dynamic>>.from(data));
  }
}
