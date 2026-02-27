import 'package:flutter/material.dart';
import 'package:mobile/services/clerk_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// ═══════════════════════════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════════════════════════

class AccountModel {
  final String id;
  final String name;
  final String type;
  final double balance;
  final bool isDefault;

  const AccountModel({
    required this.id,
    required this.name,
    required this.type,
    required this.balance,
    required this.isDefault,
  });

  factory AccountModel.fromMap(Map<String, dynamic> m) => AccountModel(
        id: m['id'] as String? ?? '',
        name: m['name'] as String? ?? 'Account',
        type: m['type'] as String? ?? '',
        balance: (m['balance'] as num?)?.toDouble() ?? 0.0,
        isDefault: m['isDefault'] as bool? ?? false,
      );
}

class TransactionModel {
  final String id;
  final String title;
  final String category;
  final double amount;
  final bool isCredit;
  final DateTime date;
  final String? accountId;

  const TransactionModel({
    required this.id,
    required this.title,
    required this.category,
    required this.amount,
    required this.isCredit,
    required this.date,
    this.accountId,
  });

  String get formattedAmount =>
      '${isCredit ? '+' : '-'}₹${_fmt(amount)}';

  String get relativeDate {
    final now = DateTime.now();
    final diff = now.difference(date).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    return '${date.day} ${_monthName(date.month)}';
  }

  static String _fmt(double v) {
    if (v >= 100000) return '${(v / 100000).toStringAsFixed(1)}L';
    if (v >= 1000) {
      final s = v.toStringAsFixed(0);
      final buf = StringBuffer();
      int rem = s.length % 3;
      if (rem != 0) buf.write(s.substring(0, rem));
      for (int i = rem; i < s.length; i += 3) {
        if (buf.isNotEmpty) buf.write(',');
        buf.write(s.substring(i, i + 3));
      }
      return buf.toString();
    }
    return v.toStringAsFixed(0);
  }

  static String _monthName(int m) => const [
        '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ][m];

  factory TransactionModel.fromMap(Map<String, dynamic> m) {
    final amt = (m['amount'] as num?)?.toDouble() ?? 0.0;
    final type = (m['type'] as String? ?? '').toUpperCase();
    return TransactionModel(
      id: m['id'] as String? ?? '',
      title: m['title'] as String? ?? m['description'] as String? ?? 'Transaction',
      category: m['category'] as String? ?? 'General',
      amount: amt.abs(),
      isCredit: type == 'INCOME' || type == 'CREDIT' || amt > 0,
      date: m['date'] != null
          ? DateTime.tryParse(m['date'] as String) ?? DateTime.now()
          : DateTime.now(),
      accountId: m['accountId'] as String?,
    );
  }
}

class ExpenseCategoryModel {
  final String label;
  final double fraction; // 0.0 – 1.0
  final double total;

  const ExpenseCategoryModel({
    required this.label,
    required this.fraction,
    required this.total,
  });
}

class MonthlyFlow {
  final String month;
  final double expenseFrac; // relative to max
  final double creditFrac;
  final double expense;
  final double credit;

  const MonthlyFlow({
    required this.month,
    required this.expenseFrac,
    required this.creditFrac,
    required this.expense,
    required this.credit,
  });
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD NOTIFIER
// ═══════════════════════════════════════════════════════════════
class DashboardNotifier extends ChangeNotifier {
  static final DashboardNotifier _instance = DashboardNotifier._();
  factory DashboardNotifier() => _instance;
  DashboardNotifier._();

  static SupabaseClient get _db => Supabase.instance.client;

  // ── State ─────────────────────────────────────────────────────
  bool _loading = false;
  String? _error;

  AccountModel? _account;
  double _totalIncome = 0;
  double _totalExpense = 0;
  double _totalSaved = 0;
  double _monthOverMonthPct = 0;

  List<TransactionModel> _recentTxns = [];
  List<ExpenseCategoryModel> _expenseCategories = [];
  List<MonthlyFlow> _monthlyFlow = [];

  // ── Getters ───────────────────────────────────────────────────
  bool get loading => _loading;
  String? get error => _error;
  AccountModel? get account => _account;
  double get totalIncome => _totalIncome;
  double get totalExpense => _totalExpense;
  double get totalSaved => _totalSaved;
  double get monthOverMonthPct => _monthOverMonthPct;
  List<TransactionModel> get recentTxns => _recentTxns;
  List<ExpenseCategoryModel> get expenseCategories => _expenseCategories;
  List<MonthlyFlow> get monthlyFlow => _monthlyFlow;

  String get formattedBalance {
    final b = _account?.balance ?? 0;
    if (b >= 10000000) return '₹${(b / 10000000).toStringAsFixed(2)}Cr';
    if (b >= 100000) return '₹${(b / 100000).toStringAsFixed(2)}L';
    // Indian comma formatting
    final s = b.toStringAsFixed(2);
    final parts = s.split('.');
    final intPart = parts[0];
    final buf = StringBuffer();
    int rem = intPart.length % 3;
    if (rem != 0) buf.write(intPart.substring(0, rem));
    for (int i = rem; i < intPart.length; i += 3) {
      if (buf.isNotEmpty) buf.write(',');
      buf.write(intPart.substring(i, i + 3));
    }
    return '₹$buf.${parts[1]}';
  }

  // ── Load ──────────────────────────────────────────────────────
  Future<void> load() async {
    if (_loading) return;
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      // ✅ Instantly grabs the user ID from the new Clerk SDK
      final userId = ClerkAuthService.currentUserId; 
      
      if (userId == null) {
        _error = 'Not authenticated';
        return;
      }

      await Future.wait([
        _loadAccount(userId),
        _loadTransactions(userId),
      ]);
    } on PostgrestException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> _loadAccount(String userId) async {
    final rows = await _db
        .from('accounts')
        .select()
        .eq('userId', userId)
        .order('isDefault', ascending: false)
        .limit(1);

    if ((rows as List).isNotEmpty) {
      _account = AccountModel.fromMap(rows.first as Map<String, dynamic>);
    }
  }

  Future<void> _loadTransactions(String userId) async {
    final now = DateTime.now();
    final thisMonthStart = DateTime(now.year, now.month, 1);
    final lastMonthStart = DateTime(now.year, now.month - 1, 1);

    // Fetch last 6 months of transactions
    final sixMonthsAgo = DateTime(now.year, now.month - 5, 1);

    final rows = await _db
        .from('transactions')
        .select()
        .eq('userId', userId)
        .gte('date', sixMonthsAgo.toIso8601String())
        .order('date', ascending: false);

    final allTxns = (rows as List)
        .map((r) => TransactionModel.fromMap(r as Map<String, dynamic>))
        .toList();

    // Recent 5 transactions
    _recentTxns = allTxns.take(5).toList();

    // ✅ FIXED: Using !isBefore so we don't skip transactions made exactly on the 1st
    final thisMonth = allTxns.where((t) => !t.date.isBefore(thisMonthStart));
    
    _totalIncome = thisMonth
        .where((t) => t.isCredit)
        .fold(0.0, (s, t) => s + t.amount);
    _totalExpense = thisMonth
        .where((t) => !t.isCredit)
        .fold(0.0, (s, t) => s + t.amount);
    _totalSaved = (_totalIncome - _totalExpense).clamp(0.0, double.infinity);

    // Month-over-month % change in expenses
    final lastMonth = allTxns.where(
      (t) => !t.date.isBefore(lastMonthStart) && t.date.isBefore(thisMonthStart),
    );
    final lastMonthExpense = lastMonth
        .where((t) => !t.isCredit)
        .fold(0.0, (s, t) => s + t.amount);
    _monthOverMonthPct = lastMonthExpense > 0
        ? ((_totalExpense - lastMonthExpense) / lastMonthExpense) * 100
        : 0;

    // Expense categories for pie chart
    final Map<String, double> catMap = {};
    for (final t in thisMonth.where((t) => !t.isCredit)) {
      catMap[t.category] = (catMap[t.category] ?? 0) + t.amount;
    }
    if (catMap.isNotEmpty) {
      final total = catMap.values.fold(0.0, (s, v) => s + v);
      final sorted = catMap.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));
      _expenseCategories = sorted.map((e) => ExpenseCategoryModel(
            label: e.key,
            fraction: e.value / total,
            total: e.value,
          )).toList();
    }

    // Monthly flow for bar chart (last 6 months)
    final Map<String, _FlowAccum> flowMap = {};
    for (final t in allTxns) {
      final key = _monthKey(t.date);
      flowMap[key] ??= _FlowAccum(t.date.month);
      if (t.isCredit) {
        flowMap[key]!.credit += t.amount;
      } else {
        flowMap[key]!.expense += t.amount;
      }
    }

    // Build last 6 months in order
    final months = List.generate(6, (i) {
      final d = DateTime(now.year, now.month - 5 + i, 1);
      return _monthKey(d);
    });

    final flows = months.map((k) {
      final acc = flowMap[k] ?? _FlowAccum(0);
      return _RawFlow(k.substring(0, 3), acc.expense, acc.credit);
    }).toList();

    final maxVal = flows.fold(
      0.0,
      (m, f) => [m, f.expense, f.credit].reduce((a, b) => a > b ? a : b),
    );

    _monthlyFlow = flows
        .map((f) => MonthlyFlow(
              month: f.month,
              expense: f.expense,
              credit: f.credit,
              expenseFrac: maxVal > 0 ? f.expense / maxVal : 0,
              creditFrac: maxVal > 0 ? f.credit / maxVal : 0,
            ))
        .toList();
  }

  static String _monthKey(DateTime d) =>
      '${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.month]}-${d.year}';

  void clear() {
    _account = null;
    _recentTxns = [];
    _expenseCategories = [];
    _monthlyFlow = [];
    _totalIncome = _totalExpense = _totalSaved = 0;
    notifyListeners();
  }
}

class _FlowAccum {
  final int month;
  double expense = 0;
  double credit = 0;
  _FlowAccum(this.month);
}

class _RawFlow {
  final String month;
  final double expense;
  final double credit;
  _RawFlow(this.month, this.expense, this.credit);
}