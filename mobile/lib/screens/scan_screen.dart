import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/provider/transaction_provider.dart';

import 'package:mobile/services/camera_service.dart';
import 'package:mobile/theme/theme.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ac;
  late Animation<double> _fade;
  late Animation<Offset> _slide;

  // Form state
  String _selectedType = '';
  String _selectedAccount = "Ved's Main Account";
  String _selectedAccountId =
      "b2a55e13-3ca1-4dd4-acfc-29347b..."; // Default account ID
  String _selectedCategory = '';
  bool _recurring = false;
  bool _typeDropOpen = false;
  bool _accountDropOpen = false;
  bool _categoryDropOpen = false;
  File? _scannedReceipt;

  // Filter state
  String _filterType = 'ALL'; // ALL, INCOME, EXPENSE

  final _amountCtrl = TextEditingController();
  final _dateCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  static const _accounts = [
    ("Ved's Main Account", 'Savings', "b2a55e13-3ca1-4dd4-acfc-29347b..."),
    ('Business Account', 'Current', "0d5ad69c-9a95-4aca-af7d-bb57e..."),
    ('Joint Account', 'Savings', "1a27f949-8ab8-4469-9b28-e6003..."),
  ];

  static const _types = ['Income', 'Expense', 'Transfer', 'Investment'];
  static const _categories = [
    'Food & Dining',
    'Transport',
    'Shopping',
    'Bills & Utilities',
    'Healthcare',
    'Entertainment',
    'Salary',
    'Investment',
    'Others',
  ];

  @override
  void initState() {
    super.initState();
    _ac = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _fade = CurvedAnimation(parent: _ac, curve: Curves.easeOut);
    _slide = Tween<Offset>(
      begin: const Offset(0, 0.05),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ac, curve: Curves.easeOutCubic));
    _ac.forward();

    // Default date to today
    final now = DateTime.now();
    _dateCtrl.text =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}';

    // Load transactions on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TransactionProvider>().loadTransactions();
    });
  }

  @override
  void dispose() {
    _ac.dispose();
    _amountCtrl.dispose();
    _dateCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  void _closeAllDropdowns() {
    setState(() {
      _typeDropOpen = false;
      _accountDropOpen = false;
      _categoryDropOpen = false;
    });
  }

  Future<void> _scanReceipt() async {
    HapticFeedback.lightImpact();

    final result = await CameraService.instance.showPickerSheet(context);

    if (!result.success) return;

    HapticFeedback.lightImpact();

    if (!result.success || !mounted) return;
    setState(() => _scannedReceipt = result.image);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Receipt captured! AI analysis coming soon…'),
          backgroundColor: T.accent,
          behavior: SnackBarBehavior.floating,
          margin: EdgeInsets.all(R.p(16)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(R.r(12)),
          ),
        ),
      );
    }
  }

  Future<void> _handleCreate() async {
    // Validation
    if (_selectedType.isEmpty) {
      _showError('Please select a transaction type');
      return;
    }
    if (_amountCtrl.text.isEmpty) {
      _showError('Please enter an amount');
      return;
    }
    if (_selectedCategory.isEmpty) {
      _showError('Please select a category');
      return;
    }

    final amount = double.tryParse(_amountCtrl.text);
    if (amount == null) {
      _showError('Please enter a valid amount');
      return;
    }

    HapticFeedback.mediumImpact();

    // Create transaction in database
    final provider = context.read<TransactionProvider>();
    final success = await provider.createTransaction(
      accountId: _selectedAccountId,
      type: _selectedType.toUpperCase(),
      amount: amount,
      category: _selectedCategory,
      date: _dateCtrl.text,
      description: _descCtrl.text,
      isRecurring: _recurring,
      recurringInterval: _recurring ? 'MONTHLY' : null,
      nextRecurringDate: _recurring
          ? DateTime.now().add(const Duration(days: 30))
          : null,
    );

    if (success && mounted) {
      // Clear form
      _amountCtrl.clear();
      _descCtrl.clear();
      setState(() {
        _selectedType = '';
        _selectedCategory = '';
        _recurring = false;
        _scannedReceipt = null;

        // Reset date to today
        final now = DateTime.now();
        _dateCtrl.text =
            '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Transaction created successfully!'),
          backgroundColor: Colors.green.shade700,
          behavior: SnackBarBehavior.floating,
          margin: EdgeInsets.all(R.p(16)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(R.r(12)),
          ),
        ),
      );
    } else if (mounted) {
      _showError('Failed to create transaction');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: T.red,
        behavior: SnackBarBehavior.floating,
        margin: EdgeInsets.all(R.p(16)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(R.r(12)),
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _getFilteredTransactions(
    TransactionProvider provider,
  ) {
    switch (_filterType) {
      case 'INCOME':
        return provider.incomeTransactions;
      case 'EXPENSE':
        return provider.expenseTransactions;
      default:
        return provider.transactions;
    }
  }

  @override
  Widget build(BuildContext context) {
    R.init(context);
    final notifier = ThemeProvider.of(context);
    T.init(notifier.isDark);

    return Consumer<TransactionProvider>(
      builder: (context, transactionProvider, _) {
        final filteredTransactions = _getFilteredTransactions(
          transactionProvider,
        );

        return FadeTransition(
          opacity: _fade,
          child: SlideTransition(
            position: _slide,
            child: GestureDetector(
              onTap: () {
                FocusScope.of(context).unfocus();
                _closeAllDropdowns();
              },
              child: RefreshIndicator(
                onRefresh: () => transactionProvider.refresh(),
                color: T.accent,
                child: CustomScrollView(
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  slivers: [
                    SliverPadding(
                      padding: EdgeInsets.fromLTRB(
                        R.p(20),
                        R.p(10),
                        R.p(20),
                        R.p(32),
                      ),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          // ── Select Account Card ─────────────────────
                          _SCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Select Account',
                                  style: TextStyle(
                                    color: T.textSecondary,
                                    fontSize: R.fs(12),
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                                SizedBox(height: R.p(10)),
                                _AccountSelector(
                                  selected: _selectedAccount,
                                  accounts: _accounts,
                                  isOpen: _accountDropOpen,
                                  onToggle: () {
                                    FocusScope.of(context).unfocus();
                                    setState(() {
                                      _typeDropOpen = false;
                                      _categoryDropOpen = false;
                                      _accountDropOpen = !_accountDropOpen;
                                    });
                                  },
                                  onSelect: (name, id) => setState(() {
                                    _selectedAccount = name;
                                    _selectedAccountId = id;
                                    _accountDropOpen = false;
                                  }),
                                ),
                                SizedBox(height: R.p(10)),
                                Center(
                                  child: GestureDetector(
                                    onTap: () {},
                                    child: Text(
                                      'Detailed Statement',
                                      style: TextStyle(
                                        color: T.accent,
                                        fontSize: R.fs(13),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          SizedBox(height: R.p(16)),

                          // ── Add Transaction Card ────────────────────
                          _SCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Center(
                                  child: Text(
                                    'Add Transaction',
                                    style: TextStyle(
                                      color: T.textPrimary,
                                      fontSize: R.fs(17),
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: -0.4,
                                    ),
                                  ),
                                ),
                                SizedBox(height: R.p(16)),

                                _ActionButton(
                                  icon: Icons.document_scanner_rounded,
                                  label: 'Scan Receipt with AI',
                                  gradient: [T.accent, T.accentSoft],
                                  onTap: _scanReceipt,
                                ),
                                SizedBox(height: R.p(10)),
                                _ActionButton(
                                  icon: Icons.mic_rounded,
                                  label: 'Add using Voice',
                                  gradient: [T.accentSoft, T.accent],
                                  onTap: () {},
                                ),
                                if (_scannedReceipt != null) ...[
                                  SizedBox(height: R.p(12)),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(
                                      R.r(14),
                                    ),
                                    child: Stack(
                                      children: [
                                        Image.file(
                                          _scannedReceipt!,
                                          width: double.infinity,
                                          height: R.p(160),
                                          fit: BoxFit.cover,
                                        ),
                                        Positioned(
                                          top: 8,
                                          right: 8,
                                          child: GestureDetector(
                                            onTap: () => setState(
                                              () => _scannedReceipt = null,
                                            ),
                                            child: Container(
                                              padding: const EdgeInsets.all(4),
                                              decoration: BoxDecoration(
                                                color: Colors.black54,
                                                borderRadius:
                                                    BorderRadius.circular(20),
                                              ),
                                              child: const Icon(
                                                Icons.close,
                                                color: Colors.white,
                                                size: 16,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],

                                SizedBox(height: R.p(22)),
                                _Divider(),
                                SizedBox(height: R.p(20)),

                                _FieldLabel('Type'),
                                SizedBox(height: R.p(8)),
                                _DropField(
                                  value: _selectedType,
                                  hint: 'Select type',
                                  isOpen: _typeDropOpen,
                                  items: _types,
                                  onToggle: () {
                                    FocusScope.of(context).unfocus();
                                    setState(() {
                                      _accountDropOpen = false;
                                      _categoryDropOpen = false;
                                      _typeDropOpen = !_typeDropOpen;
                                    });
                                  },
                                  onSelect: (v) => setState(() {
                                    _selectedType = v;
                                    _typeDropOpen = false;
                                  }),
                                  accent: _typeColor(_selectedType),
                                ),

                                SizedBox(height: R.p(16)),

                                Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          _FieldLabel('Amount'),
                                          SizedBox(height: R.p(8)),
                                          _TextField(
                                            controller: _amountCtrl,
                                            hint: '₹ 0.00',
                                            keyboardType:
                                                const TextInputType.numberWithOptions(
                                                  decimal: true,
                                                ),
                                            prefix: Text(
                                              '₹',
                                              style: TextStyle(
                                                color: T.accent,
                                                fontWeight: FontWeight.w700,
                                                fontSize: R.fs(14),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    SizedBox(width: R.p(12)),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          _FieldLabel('Account'),
                                          SizedBox(height: R.p(8)),
                                          _ReadOnlyField(
                                            value: _selectedAccount
                                                .split(' ')
                                                .first,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),

                                SizedBox(height: R.p(16)),

                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    _FieldLabel('Category'),
                                    SizedBox(width: R.p(12)),
                                    Expanded(
                                      child: _DropField(
                                        value: _selectedCategory,
                                        hint: 'Select',
                                        isOpen: _categoryDropOpen,
                                        items: _categories,
                                        onToggle: () {
                                          FocusScope.of(context).unfocus();
                                          setState(() {
                                            _typeDropOpen = false;
                                            _accountDropOpen = false;
                                            _categoryDropOpen =
                                                !_categoryDropOpen;
                                          });
                                        },
                                        onSelect: (v) => setState(() {
                                          _selectedCategory = v;
                                          _categoryDropOpen = false;
                                        }),
                                        accent: T.gold,
                                      ),
                                    ),
                                  ],
                                ),

                                SizedBox(height: R.p(16)),

                                _FieldLabel('Date'),
                                SizedBox(height: R.p(8)),
                                _TextField(
                                  controller: _dateCtrl,
                                  hint: 'DD/MM/YYYY',
                                  keyboardType: TextInputType.datetime,
                                  suffix: Icon(
                                    Icons.calendar_today_rounded,
                                    color: T.textSecondary,
                                    size: R.fs(16),
                                  ),
                                  onTap: () async {
                                    FocusScope.of(context).unfocus();
                                    _closeAllDropdowns();
                                    final picked = await showDatePicker(
                                      context: context,
                                      initialDate: DateTime.now(),
                                      firstDate: DateTime(2020),
                                      lastDate: DateTime(2030),
                                      builder: (ctx, child) => Theme(
                                        data: Theme.of(ctx).copyWith(
                                          colorScheme: ColorScheme.dark(
                                            primary: T.accent,
                                            surface: T.surface,
                                          ),
                                        ),
                                        child: child!,
                                      ),
                                    );
                                    if (picked != null) {
                                      _dateCtrl.text =
                                          '${picked.day.toString().padLeft(2, '0')}/${picked.month.toString().padLeft(2, '0')}/${picked.year}';
                                    }
                                  },
                                ),

                                SizedBox(height: R.p(16)),

                                _FieldLabel('Description'),
                                SizedBox(height: R.p(8)),
                                _TextField(
                                  controller: _descCtrl,
                                  hint: 'Add a note...',
                                  keyboardType: TextInputType.multiline,
                                  maxLines: 2,
                                ),

                                SizedBox(height: R.p(20)),

                                _RecurringRow(
                                  value: _recurring,
                                  onChanged: (v) =>
                                      setState(() => _recurring = v),
                                ),

                                SizedBox(height: R.p(24)),

                                Row(
                                  children: [
                                    Expanded(
                                      child: _OutlineBtn(
                                        label: 'Cancel',
                                        color: T.red,
                                        onTap: () {
                                          _amountCtrl.clear();
                                          _descCtrl.clear();
                                          setState(() {
                                            _selectedType = '';
                                            _selectedCategory = '';
                                            _recurring = false;
                                            _scannedReceipt = null;
                                          });
                                        },
                                      ),
                                    ),
                                    SizedBox(width: R.p(12)),
                                    Expanded(
                                      flex: 2,
                                      child: _GradientBtn(
                                        label: 'Create Transaction',
                                        onTap: _handleCreate,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          // ── Transaction History ────────────────────
                          if (filteredTransactions.isNotEmpty) ...[
                            SizedBox(height: R.p(24)),

                            // Filter buttons
                            Row(
                              children: [
                                Text(
                                  'Recent Transactions',
                                  style: TextStyle(
                                    color: T.textPrimary,
                                    fontSize: R.fs(18),
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.4,
                                  ),
                                ),
                                const Spacer(),
                                _FilterChip(
                                  label: 'All',
                                  isSelected: _filterType == 'ALL',
                                  onTap: () =>
                                      setState(() => _filterType = 'ALL'),
                                ),
                                SizedBox(width: R.p(6)),
                                _FilterChip(
                                  label: 'Income',
                                  isSelected: _filterType == 'INCOME',
                                  color: T.green,
                                  onTap: () =>
                                      setState(() => _filterType = 'INCOME'),
                                ),
                                SizedBox(width: R.p(6)),
                                _FilterChip(
                                  label: 'Expense',
                                  isSelected: _filterType == 'EXPENSE',
                                  color: T.red,
                                  onTap: () =>
                                      setState(() => _filterType = 'EXPENSE'),
                                ),
                              ],
                            ),

                            SizedBox(height: R.p(12)),

                            ...filteredTransactions.map(
                              (txn) => Padding(
                                padding: EdgeInsets.only(bottom: R.p(12)),
                                child: _TransactionCard(transaction: txn),
                              ),
                            ),
                          ] else if (transactionProvider.isLoading) ...[
                            SizedBox(height: R.p(24)),
                            Center(
                              child: CircularProgressIndicator(color: T.accent),
                            ),
                          ] else ...[
                            SizedBox(height: R.p(24)),
                            Center(
                              child: Text(
                                'No transactions yet',
                                style: TextStyle(
                                  color: T.textMuted,
                                  fontSize: R.fs(14),
                                ),
                              ),
                            ),
                          ],

                          SizedBox(height: R.p(8)),
                        ]),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'Income':
        return T.green;
      case 'Expense':
        return T.red;
      case 'Transfer':
        return T.accent;
      case 'Investment':
        return T.gold;
      default:
        return T.textSecondary;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// FILTER CHIP
// ═══════════════════════════════════════════════════════════════
class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color? color;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? T.accent;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.symmetric(horizontal: R.p(12), vertical: R.p(6)),
        decoration: BoxDecoration(
          color: isSelected ? chipColor.withOpacity(0.15) : T.elevated,
          borderRadius: BorderRadius.circular(R.r(20)),
          border: Border.all(
            color: isSelected ? chipColor : T.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? chipColor : T.textSecondary,
            fontSize: R.fs(11),
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTION CARD
// ═══════════════════════════════════════════════════════════════
class _TransactionCard extends StatelessWidget {
  final Map<String, dynamic> transaction;

  const _TransactionCard({required this.transaction});

  Color _getTypeColor(String type) {
    switch (type) {
      case 'INCOME':
        return T.green;
      case 'EXPENSE':
        return T.red;
      case 'TRANSFER':
        return T.accent;
      case 'INVESTMENT':
        return T.gold;
      default:
        return T.textSecondary;
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'INCOME':
        return Icons.arrow_downward_rounded;
      case 'EXPENSE':
        return Icons.arrow_upward_rounded;
      case 'TRANSFER':
        return Icons.swap_horiz_rounded;
      case 'INVESTMENT':
        return Icons.trending_up_rounded;
      default:
        return Icons.circle;
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'Food & Dining':
        return Icons.restaurant_rounded;
      case 'Transport':
        return Icons.directions_car_rounded;
      case 'Shopping':
        return Icons.shopping_bag_rounded;
      case 'Bills & Utilities':
        return Icons.receipt_rounded;
      case 'Healthcare':
        return Icons.local_hospital_rounded;
      case 'Entertainment':
        return Icons.movie_rounded;
      case 'Salary':
        return Icons.account_balance_wallet_rounded;
      case 'Investment':
        return Icons.show_chart_rounded;
      default:
        return Icons.category_rounded;
    }
  }

  String _formatAmount(dynamic amount) {
    if (amount is String) {
      return double.tryParse(amount)?.toStringAsFixed(2) ?? amount;
    } else if (amount is num) {
      return amount.toStringAsFixed(2);
    }
    return '0.00';
  }

  @override
  Widget build(BuildContext context) {
    final type = transaction['type'] as String;
    final amount = _formatAmount(transaction['amount']);
    final category = transaction['category'] as String;
    final date = transaction['date'] as String;
    final description = transaction['description'] as String? ?? '';
    final recurring = transaction['isRecurring'] as bool? ?? false;
    final typeColor = _getTypeColor(type);

    return _SCard(
      child: Row(
        children: [
          Container(
            width: R.p(44).clamp(38.0, 50.0),
            height: R.p(44).clamp(38.0, 50.0),
            decoration: BoxDecoration(
              color: typeColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(R.r(12)),
            ),
            child: Icon(
              _getCategoryIcon(category),
              color: typeColor,
              size: R.fs(20),
            ),
          ),
          SizedBox(width: R.p(14)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        category,
                        style: TextStyle(
                          color: T.textPrimary,
                          fontSize: R.fs(15),
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2,
                        ),
                      ),
                    ),
                    Text(
                      '₹ $amount',
                      style: TextStyle(
                        color: typeColor,
                        fontSize: R.fs(16),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: R.p(4)),
                Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: R.p(8),
                        vertical: R.p(3),
                      ),
                      decoration: BoxDecoration(
                        color: typeColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(R.r(6)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _getTypeIcon(type),
                            color: typeColor,
                            size: R.fs(11),
                          ),
                          SizedBox(width: R.p(4)),
                          Text(
                            type.toLowerCase().capitalize(),
                            style: TextStyle(
                              color: typeColor,
                              fontSize: R.fs(10),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (recurring) ...[
                      SizedBox(width: R.p(6)),
                      Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: R.p(6),
                          vertical: R.p(3),
                        ),
                        decoration: BoxDecoration(
                          color: T.accent.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(R.r(6)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.repeat_rounded,
                              color: T.accent,
                              size: R.fs(10),
                            ),
                            SizedBox(width: R.p(3)),
                            Text(
                              'Recurring',
                              style: TextStyle(
                                color: T.accent,
                                fontSize: R.fs(9),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                SizedBox(height: R.p(6)),
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today_rounded,
                      color: T.textMuted,
                      size: R.fs(11),
                    ),
                    SizedBox(width: R.p(4)),
                    Text(
                      date,
                      style: TextStyle(
                        color: T.textSecondary,
                        fontSize: R.fs(11),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (description.isNotEmpty) ...[
                      SizedBox(width: R.p(8)),
                      Text(
                        '•',
                        style: TextStyle(
                          color: T.textMuted,
                          fontSize: R.fs(11),
                        ),
                      ),
                      SizedBox(width: R.p(8)),
                      Expanded(
                        child: Text(
                          description,
                          style: TextStyle(
                            color: T.textSecondary,
                            fontSize: R.fs(11),
                            fontWeight: FontWeight.w400,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

extension StringExtension on String {
  String capitalize() {
    return "${this[0].toUpperCase()}${substring(1).toLowerCase()}";
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNT SELECTOR
// ═══════════════════════════════════════════════════════════════
class _AccountSelector extends StatelessWidget {
  final String selected;
  final List<(String, String, String)> accounts;
  final bool isOpen;
  final VoidCallback onToggle;
  final Function(String, String) onSelect;

  const _AccountSelector({
    required this.selected,
    required this.accounts,
    required this.isOpen,
    required this.onToggle,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final sel = accounts.firstWhere(
      (a) => a.$1 == selected,
      orElse: () => accounts.first,
    );

    return Column(
      children: [
        GestureDetector(
          onTap: onToggle,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: EdgeInsets.all(R.p(14)),
            decoration: BoxDecoration(
              color: T.elevated,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(R.r(14)),
                topRight: Radius.circular(R.r(14)),
                bottomLeft: Radius.circular(isOpen ? 0 : R.r(14)),
                bottomRight: Radius.circular(isOpen ? 0 : R.r(14)),
              ),
              border: Border.all(
                color: isOpen ? T.accent.withOpacity(0.6) : T.border,
                width: isOpen ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: R.p(36).clamp(30.0, 44.0),
                  height: R.p(36).clamp(30.0, 44.0),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [T.accent, T.accentSoft]),
                    borderRadius: BorderRadius.circular(R.r(10)),
                  ),
                  child: Icon(
                    Icons.account_balance_rounded,
                    color: Colors.white,
                    size: R.fs(16),
                  ),
                ),
                SizedBox(width: R.p(12)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sel.$1,
                        style: TextStyle(
                          color: T.textPrimary,
                          fontSize: R.fs(14),
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2,
                        ),
                      ),
                      SizedBox(height: R.p(2)),
                      Text(
                        sel.$2,
                        style: TextStyle(
                          color: T.textSecondary,
                          fontSize: R.fs(11),
                        ),
                      ),
                    ],
                  ),
                ),
                AnimatedRotation(
                  turns: isOpen ? 0.5 : 0,
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: T.textSecondary,
                    size: R.fs(20),
                  ),
                ),
              ],
            ),
          ),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          child: isOpen
              ? Container(
                  decoration: BoxDecoration(
                    color: T.elevated,
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(R.r(14)),
                      bottomRight: Radius.circular(R.r(14)),
                    ),
                    border: Border(
                      left: BorderSide(
                        color: T.accent.withOpacity(0.6),
                        width: 1.5,
                      ),
                      right: BorderSide(
                        color: T.accent.withOpacity(0.6),
                        width: 1.5,
                      ),
                      bottom: BorderSide(
                        color: T.accent.withOpacity(0.6),
                        width: 1.5,
                      ),
                    ),
                  ),
                  child: Column(
                    children: accounts.map((a) {
                      final isSel = a.$1 == selected;
                      return GestureDetector(
                        onTap: () => onSelect(a.$1, a.$3),
                        child: Container(
                          width: double.infinity,
                          padding: EdgeInsets.symmetric(
                            horizontal: R.p(14),
                            vertical: R.p(12),
                          ),
                          decoration: BoxDecoration(
                            color: isSel
                                ? T.accent.withOpacity(0.1)
                                : Colors.transparent,
                            border: Border(
                              top: BorderSide(
                                color: T.border.withOpacity(0.5),
                                width: 1,
                              ),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.account_balance_wallet_rounded,
                                color: isSel ? T.accent : T.textSecondary,
                                size: R.fs(15),
                              ),
                              SizedBox(width: R.p(10)),
                              Expanded(
                                child: Text(
                                  '${a.$1} · ${a.$2}',
                                  style: TextStyle(
                                    color: isSel ? T.accent : T.textSecondary,
                                    fontSize: R.fs(13),
                                    fontWeight: isSel
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                  ),
                                ),
                              ),
                              if (isSel)
                                Icon(
                                  Icons.check_rounded,
                                  color: T.accent,
                                  size: R.fs(16),
                                ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }
}

// Continue with remaining widget classes...
// (ActionButton, DropField, TextField, ReadOnlyField, RecurringRow, OutlineBtn, GradientBtn, SCard, FieldLabel, Divider)
// These remain the same as in the previous version

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final List<Color> gradient;
  final VoidCallback onTap;
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(R.r(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.r(14)),
        onTap: onTap,
        child: Ink(
          height: R.p(50).clamp(44.0, 58.0),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: gradient,
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(R.r(14)),
            boxShadow: [
              BoxShadow(
                color: gradient.first.withOpacity(0.3),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: R.fs(18)),
              SizedBox(width: R.p(10)),
              Text(
                label,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: R.fs(14),
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DropField extends StatelessWidget {
  final String value, hint;
  final bool isOpen;
  final List<String> items;
  final VoidCallback onToggle;
  final ValueChanged<String> onSelect;
  final Color accent;

  const _DropField({
    required this.value,
    required this.hint,
    required this.isOpen,
    required this.items,
    required this.onToggle,
    required this.onSelect,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: onToggle,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: EdgeInsets.symmetric(
              horizontal: R.p(14),
              vertical: R.p(13),
            ),
            decoration: BoxDecoration(
              color: T.surface,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(R.r(12)),
                topRight: Radius.circular(R.r(12)),
                bottomLeft: Radius.circular(isOpen ? 0 : R.r(12)),
                bottomRight: Radius.circular(isOpen ? 0 : R.r(12)),
              ),
              border: Border.all(
                color: isOpen
                    ? accent.withOpacity(0.7)
                    : value.isEmpty
                    ? T.border
                    : accent.withOpacity(0.4),
                width: isOpen ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    value.isEmpty ? hint : value,
                    style: TextStyle(
                      color: value.isEmpty ? T.textMuted : accent,
                      fontSize: R.fs(13),
                      fontWeight: value.isEmpty
                          ? FontWeight.w400
                          : FontWeight.w700,
                    ),
                  ),
                ),
                AnimatedRotation(
                  turns: isOpen ? 0.5 : 0,
                  duration: const Duration(milliseconds: 180),
                  child: Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: T.textSecondary,
                    size: R.fs(18),
                  ),
                ),
              ],
            ),
          ),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          child: isOpen
              ? Container(
                  constraints: const BoxConstraints(maxHeight: 200),
                  decoration: BoxDecoration(
                    color: T.surface,
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(R.r(12)),
                      bottomRight: Radius.circular(R.r(12)),
                    ),
                    border: Border(
                      left: BorderSide(
                        color: accent.withOpacity(0.7),
                        width: 1.5,
                      ),
                      right: BorderSide(
                        color: accent.withOpacity(0.7),
                        width: 1.5,
                      ),
                      bottom: BorderSide(
                        color: accent.withOpacity(0.7),
                        width: 1.5,
                      ),
                    ),
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      children: items.map((item) {
                        final isSel = item == value;
                        return GestureDetector(
                          onTap: () => onSelect(item),
                          child: Container(
                            width: double.infinity,
                            padding: EdgeInsets.symmetric(
                              horizontal: R.p(14),
                              vertical: R.p(11),
                            ),
                            decoration: BoxDecoration(
                              color: isSel
                                  ? accent.withOpacity(0.1)
                                  : Colors.transparent,
                              border: Border(
                                top: BorderSide(
                                  color: T.border.withOpacity(0.4),
                                  width: 1,
                                ),
                              ),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    item,
                                    style: TextStyle(
                                      color: isSel ? accent : T.textSecondary,
                                      fontSize: R.fs(13),
                                      fontWeight: isSel
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                    ),
                                  ),
                                ),
                                if (isSel)
                                  Icon(
                                    Icons.check_rounded,
                                    color: accent,
                                    size: R.fs(15),
                                  ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }
}

class _TextField extends StatefulWidget {
  final TextEditingController controller;
  final String hint;
  final TextInputType keyboardType;
  final Widget? prefix;
  final Widget? suffix;
  final int maxLines;
  final VoidCallback? onTap;

  const _TextField({
    required this.controller,
    required this.hint,
    required this.keyboardType,
    this.prefix,
    this.suffix,
    this.maxLines = 1,
    this.onTap,
  });

  @override
  State<_TextField> createState() => _TextFieldState();
}

class _TextFieldState extends State<_TextField> {
  final _focus = FocusNode();
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() => _focused = _focus.hasFocus));
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      decoration: BoxDecoration(
        color: T.surface,
        borderRadius: BorderRadius.circular(R.r(12)),
        border: Border.all(
          color: _focused ? T.accent.withOpacity(0.7) : T.border,
          width: _focused ? 1.5 : 1,
        ),
        boxShadow: _focused
            ? [
                BoxShadow(
                  color: T.accent.withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ]
            : [],
      ),
      child: TextField(
        controller: widget.controller,
        focusNode: _focus,
        keyboardType: widget.keyboardType,
        maxLines: widget.maxLines,
        readOnly: widget.onTap != null,
        onTap: widget.onTap,
        style: TextStyle(
          color: T.textPrimary,
          fontSize: R.fs(14),
          fontWeight: FontWeight.w500,
        ),
        decoration: InputDecoration(
          hintText: widget.hint,
          hintStyle: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
          prefixIcon: widget.prefix != null
              ? Padding(
                  padding: EdgeInsets.only(left: R.p(12), right: R.p(6)),
                  child: widget.prefix,
                )
              : null,
          prefixIconConstraints: const BoxConstraints(),
          suffixIcon: widget.suffix != null
              ? Padding(
                  padding: EdgeInsets.only(right: R.p(12)),
                  child: widget.suffix,
                )
              : null,
          suffixIconConstraints: const BoxConstraints(),
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(
            horizontal: R.p(14),
            vertical: R.p(13),
          ),
        ),
      ),
    );
  }
}

class _ReadOnlyField extends StatelessWidget {
  final String value;
  const _ReadOnlyField({required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(horizontal: R.p(14), vertical: R.p(13)),
      decoration: BoxDecoration(
        color: T.elevated,
        borderRadius: BorderRadius.circular(R.r(12)),
        border: Border.all(color: T.border, width: 1),
      ),
      child: Text(
        value,
        style: TextStyle(
          color: T.textSecondary,
          fontSize: R.fs(14),
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _RecurringRow extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;
  const _RecurringRow({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.symmetric(horizontal: R.p(16), vertical: R.p(14)),
        decoration: BoxDecoration(
          color: value ? T.accent.withOpacity(0.08) : T.elevated,
          borderRadius: BorderRadius.circular(R.r(14)),
          border: Border.all(
            color: value ? T.accent.withOpacity(0.4) : T.border,
            width: value ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.repeat_rounded,
              color: value ? T.accent : T.textSecondary,
              size: R.fs(18),
            ),
            SizedBox(width: R.p(12)),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recurring transaction',
                    style: TextStyle(
                      color: value ? T.accent : T.textPrimary,
                      fontSize: R.fs(14),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (value)
                    Text(
                      'Will repeat monthly',
                      style: TextStyle(color: T.textMuted, fontSize: R.fs(11)),
                    ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: R.p(44).clamp(38.0, 50.0),
              height: R.p(24).clamp(20.0, 28.0),
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: value
                    ? LinearGradient(colors: [T.accent, T.accentSoft])
                    : null,
                color: value ? null : T.border,
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeInOut,
                alignment: value ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: R.p(18).clamp(14.0, 22.0),
                  height: R.p(18).clamp(14.0, 22.0),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black26,
                        blurRadius: 4,
                        offset: Offset(0, 1),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OutlineBtn extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _OutlineBtn({
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withOpacity(0.08),
      borderRadius: BorderRadius.circular(R.r(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.r(14)),
        onTap: onTap,
        child: Container(
          height: R.p(52).clamp(46.0, 58.0),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(R.r(14)),
            border: Border.all(color: color.withOpacity(0.5), width: 1.5),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: R.fs(14),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GradientBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _GradientBtn({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(R.r(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.r(14)),
        onTap: onTap,
        child: Ink(
          height: R.p(52).clamp(46.0, 58.0),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [T.accent, T.accentSoft],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(R.r(14)),
            boxShadow: [
              BoxShadow(
                color: T.accent.withOpacity(0.38),
                blurRadius: 18,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: Colors.white,
                fontSize: R.fs(14),
                fontWeight: FontWeight.w700,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SCard extends StatelessWidget {
  final Widget child;
  const _SCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      width: double.infinity,
      padding: EdgeInsets.all(R.p(20)),
      decoration: BoxDecoration(
        color: T.surface,
        borderRadius: BorderRadius.circular(R.r(22)),
        border: Border.all(color: T.border, width: 1),
        boxShadow: [
          BoxShadow(
            color: T.border.withOpacity(0.5),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        color: T.textSecondary,
        fontSize: R.fs(12),
        fontWeight: FontWeight.w600,
        letterSpacing: 0.3,
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Divider(color: T.border, height: 1)),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: R.p(12)),
          child: Text(
            'or fill manually',
            style: TextStyle(color: T.textMuted, fontSize: R.fs(11)),
          ),
        ),
        Expanded(child: Divider(color: T.border, height: 1)),
      ],
    );
  }
}
