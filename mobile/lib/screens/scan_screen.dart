import 'dart:io';

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/models/user_provider.dart';
import 'package:mobile/provider/transaction_provider.dart';

import 'package:mobile/services/camera_service.dart';
import 'package:mobile/services/gemini_service.dart';
import 'package:mobile/services/gemini_voice.dart';
import 'package:mobile/services/voice_recorder.dart';
import 'package:mobile/theme/theme.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

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

  static const _uuid = Uuid();

  // Form state
  String _selectedType = '';
  String _selectedAccount = '';
  String _selectedAccountId = '';
  String _selectedCategory = '';
  bool _recurring = false;
  bool _typeDropOpen = false;
  bool _accountDropOpen = false;
  bool _categoryDropOpen = false;
  File? _scannedReceipt;

  // Transaction list state
  String _filterType = 'ALL';
  bool _showAll = false;
  static const int _previewCount = 5;

  final _amountCtrl = TextEditingController();
  final _dateCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

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

    final now = DateTime.now();
    _dateCtrl.text =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}';

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userId = ClerkAuth.of(context).user?.id ?? '';
      context.read<TransactionProvider>().loadTransactions(clerkUserId: userId);

      context.read<UserNotifier>().load(clerkUserId: userId);

      // ✅ Set default account if available
      _setDefaultAccount();
    });
  }

  // ✅ NEW METHOD: Set default account from UserProvider
  void _setDefaultAccount() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final userNotifier = context.watch<UserNotifier>();
      final defaultAcc = userNotifier.defaultAccount;

      if (defaultAcc != null && _selectedAccountId.isEmpty) {
        setState(() {
          _selectedAccount = defaultAcc.name;
          _selectedAccountId = defaultAcc.id;
        });
      }
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

  void _closeAllDropdowns() => setState(() {
    _typeDropOpen = false;
    _accountDropOpen = false;
    _categoryDropOpen = false;
  });

  void _switchFilter(String type) => setState(() {
    _filterType = type;
    _showAll = false;
  });

  Future<void> _scanReceipt() async {
    HapticFeedback.lightImpact();
    final result = await CameraService.instance.showPickerSheet(context);
    if (!result.success || !mounted) return;

    HapticFeedback.lightImpact();
    setState(() => _scannedReceipt = result.image);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: const [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2,
              ),
            ),
            SizedBox(width: 12),
            Text('Analyzing receipt with Gemini AI…'),
          ],
        ),
        backgroundColor: T.accent,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 15),
        margin: EdgeInsets.all(R.p(16)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(R.r(12)),
        ),
      ),
    );

    final receiptData = await GeminiService.instance.analyzeReceipt(
      result.image!,
    );

    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    if (!receiptData.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            receiptData.error?.contains('Not a receipt') == true
                ? 'Image doesn\'t look like a receipt. Fill manually.'
                : 'Could not read receipt: ${receiptData.error}',
          ),
          backgroundColor: T.red,
          behavior: SnackBarBehavior.floating,
          margin: EdgeInsets.all(R.p(16)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(R.r(12)),
          ),
        ),
      );
      return;
    }

    _applyExtractedData(
      amount: receiptData.amount,
      category: receiptData.category,
      description: receiptData.description,
      date: receiptData.date,
      type: receiptData.type,
    );

    HapticFeedback.mediumImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '✅ Receipt scanned! ₹${receiptData.amount?.toStringAsFixed(0)} · ${receiptData.category}',
        ),
        backgroundColor: Colors.green.shade700,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
        margin: EdgeInsets.all(R.p(16)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(R.r(12)),
        ),
      ),
    );
  }

  void _applyExtractedData({
    double? amount,
    String? category,
    String? description,
    String? date,
    String? type,
  }) {
    setState(() {
      if (amount != null) {
        _amountCtrl.text = amount.toStringAsFixed(2);
      }
      if (category != null && category.isNotEmpty) {
        _selectedCategory = category;
      }
      if (description != null && description.isNotEmpty) {
        _descCtrl.text = description;
      }
      if (date != null) {
        try {
          final d = DateTime.parse(date);
          _dateCtrl.text =
              '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
        } catch (_) {}
      }
      if (type != null) {
        const typeMap = {
          'EXPENSE': 'Expense',
          'INCOME': 'Income',
          'TRANSFER': 'Transfer',
          'INVESTMENT': 'Investment',
        };
        _selectedType = typeMap[type] ?? 'Expense';
      }
    });
  }

  Future<void> _handleVoice() async {
    HapticFeedback.lightImpact();

    final audioFile = await showVoiceRecorderSheet(context);

    if (audioFile == null || !mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: const [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2,
              ),
            ),
            SizedBox(width: 12),
            Text('Analyzing voice with Gemini AI…'),
          ],
        ),
        backgroundColor: T.accent,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 15),
        margin: EdgeInsets.all(R.p(16)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(R.r(12)),
        ),
      ),
    );

    final voiceData = await GeminiVoiceService.instance.analyzeVoice(audioFile);

    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    if (!voiceData.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            voiceData.error ?? 'Could not understand. Please try again.',
          ),
          backgroundColor: T.red,
          behavior: SnackBarBehavior.floating,
          margin: EdgeInsets.all(R.p(16)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(R.r(12)),
          ),
        ),
      );
      return;
    }

    if (voiceData.transcription != null && mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: T.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Row(
            children: [
              Icon(Icons.mic_rounded, color: T.accent, size: 20),
              const SizedBox(width: 8),
              Text(
                'I heard…',
                style: TextStyle(
                  color: T.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: T.elevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: T.border),
                ),
                child: Text(
                  '"${voiceData.transcription}"',
                  style: TextStyle(
                    color: T.textSecondary,
                    fontSize: 14,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _ConfirmRow(
                icon: Icons.currency_rupee_rounded,
                label: 'Amount',
                value: '₹${voiceData.amount?.toStringAsFixed(0)}',
              ),
              _ConfirmRow(
                icon: Icons.category_rounded,
                label: 'Category',
                value: voiceData.category ?? '—',
              ),
              _ConfirmRow(
                icon: Icons.arrow_circle_down_rounded,
                label: 'Type',
                value: voiceData.type ?? 'EXPENSE',
              ),
              _ConfirmRow(
                icon: Icons.notes_rounded,
                label: 'Note',
                value: voiceData.description ?? '—',
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(
                'Re-record',
                style: TextStyle(color: T.textSecondary),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: T.accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Use This'),
            ),
          ],
        ),
      ).then((confirmed) {
        if (confirmed == true && mounted) {
          _applyExtractedData(
            amount: voiceData.amount,
            category: voiceData.category,
            description: voiceData.description,
            date: voiceData.date,
            type: voiceData.type,
          );

          HapticFeedback.mediumImpact();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '🎤 Voice captured! ₹${voiceData.amount?.toStringAsFixed(0)} · ${voiceData.category}',
              ),
              backgroundColor: Colors.green.shade700,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 3),
              margin: EdgeInsets.all(R.p(16)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(R.r(12)),
              ),
            ),
          );
        }
      });
    }
  }

  Future<void> _handleCreate() async {
    // ✅ VALIDATE ACCOUNT FIRST
    if (_selectedAccountId.isEmpty) {
      _showError('Please select an account');
      return;
    }
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
    if (amount == null || amount <= 0) {
      _showError('Please enter a valid amount');
      return;
    }

    HapticFeedback.mediumImpact();

    final clerkUserId = ClerkAuth.of(context).user?.id ?? '';

    final dateParts = _dateCtrl.text.split('/');
    DateTime parsedDate;
    try {
      parsedDate = DateTime(
        int.parse(dateParts[2]),
        int.parse(dateParts[1]),
        int.parse(dateParts[0]),
      );
    } catch (e) {
      _showError('Invalid date format');
      return;
    }

    print('🔍 Creating transaction:');
    print('  Transaction ID: ${_uuid.v4()}');
    print('  User: $clerkUserId');
    print('  Account ID: $_selectedAccountId'); // ✅ Now using real account ID
    print('  Type: ${_selectedType.toUpperCase()}');
    print('  Amount: $amount');
    print('  Category: $_selectedCategory');
    print('  Date (ISO): ${parsedDate.toIso8601String()}');
    print('  Description: ${_descCtrl.text}');
    print('  Recurring: $_recurring');

    final provider = context.read<TransactionProvider>();

    final success = await provider.createTransaction(
      clerkUserId: clerkUserId,
      accountId: _selectedAccountId,
      type: _selectedType.toUpperCase(),
      amount: amount,
      category: _selectedCategory,
      date: parsedDate.toIso8601String(),
      description: _descCtrl.text,
      isRecurring: _recurring,
      recurringInterval: _recurring ? 'MONTHLY' : null,
      nextRecurringDate: _recurring
          ? DateTime.now().add(const Duration(days: 30))
          : null,
    );

    print('✅ Transaction creation result: $success');

    if (success && mounted) {
      _amountCtrl.clear();
      _descCtrl.clear();
      final now = DateTime.now();
      setState(() {
        _selectedType = '';
        _selectedCategory = '';
        _recurring = false;
        _scannedReceipt = null;
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
      _showError('Failed to create transaction. Please try again.');
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

  List<Map<String, dynamic>> _getFiltered(TransactionProvider p) {
    switch (_filterType) {
      case 'INCOME':
        return p.incomeTransactions;
      case 'EXPENSE':
        return p.expenseTransactions;
      default:
        return p.transactions;
    }
  }

  @override
  Widget build(BuildContext context) {
    R.init(context);
    final notifier = ThemeProvider.of(context);
    T.init(notifier.isDark);

    final userNotifier = context.watch<UserNotifier>();
    final accounts = userNotifier.accounts;

    return Consumer<TransactionProvider>(
      builder: (context, provider, _) {
        final allFiltered = _getFiltered(provider);
        final visible = _showAll
            ? allFiltered
            : allFiltered.take(_previewCount).toList();
        final hasMore = !_showAll && allFiltered.length > _previewCount;

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
                onRefresh: () {
                  final uid = ClerkAuth.of(context).user?.id ?? '';
                  return provider.refresh(clerkUserId: uid);
                },
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
                          // ── Account Selector ──────────────────────
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
                                // ✅ DYNAMIC ACCOUNT SELECTOR
                                _AccountSelector(
                                  selected: _selectedAccount,
                                  accounts: accounts
                                      .map((a) => (a.name, a.type, a.id))
                                      .toList(),
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

                          // ── Add Transaction Card ──────────────────
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
                                  onTap: _handleVoice,
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

                                // Type
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

                                // Amount + Account
                                Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          _FieldLabel('Amount'),
                                          SizedBox(height: R.p(8)),
                                          _TField(
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

                                // Category
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

                                // Date
                                _FieldLabel('Date'),
                                SizedBox(height: R.p(8)),
                                _TField(
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

                                // Description
                                _FieldLabel('Description'),
                                SizedBox(height: R.p(8)),
                                _TField(
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
                                        isLoading: provider.isLoading,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          SizedBox(height: R.p(24)),

                          // ── Transaction History (rest of code remains the same) ──
                          Row(
                            children: [
                              Text(
                                'Recent Transactions',
                                style: TextStyle(
                                  color: T.textPrimary,
                                  fontSize: R.fs(16),
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -0.4,
                                ),
                              ),
                              const Spacer(),
                              GestureDetector(
                                onTap: () =>
                                    setState(() => _showAll = !_showAll),
                                child: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 200),
                                  child: Text(
                                    _showAll ? 'Show less' : 'See all',
                                    key: ValueKey(_showAll),
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

                          SizedBox(height: R.p(12)),

                          Container(
                            decoration: BoxDecoration(
                              color: T.surface,
                              borderRadius: BorderRadius.circular(R.r(12)),
                              border: Border.all(color: T.border, width: 1),
                            ),
                            padding: EdgeInsets.all(R.p(4)),
                            child: Row(
                              children: [
                                _TabItem(
                                  label: 'All',
                                  count: provider.transactions.length,
                                  active: _filterType == 'ALL',
                                  onTap: () => _switchFilter('ALL'),
                                  color: T.accent,
                                ),
                                SizedBox(width: R.p(4)),
                                _TabItem(
                                  label: 'Income',
                                  count: provider.incomeTransactions.length,
                                  active: _filterType == 'INCOME',
                                  onTap: () => _switchFilter('INCOME'),
                                  color: T.green,
                                ),
                                SizedBox(width: R.p(4)),
                                _TabItem(
                                  label: 'Expense',
                                  count: provider.expenseTransactions.length,
                                  active: _filterType == 'EXPENSE',
                                  onTap: () => _switchFilter('EXPENSE'),
                                  color: T.red,
                                ),
                              ],
                            ),
                          ),

                          SizedBox(height: R.p(10)),

                          AnimatedContainer(
                            duration: const Duration(milliseconds: 320),
                            decoration: BoxDecoration(
                              color: T.surface,
                              borderRadius: BorderRadius.circular(R.r(20)),
                              border: Border.all(color: T.border, width: 1),
                              boxShadow: [
                                BoxShadow(
                                  color: T.border.withOpacity(0.5),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: provider.isLoading && allFiltered.isEmpty
                                ? _buildShimmer()
                                : allFiltered.isEmpty
                                ? _buildEmpty()
                                : Column(
                                    children: [
                                      ..._buildTxnList(visible),

                                      if (hasMore) ...[
                                        Padding(
                                          padding: EdgeInsets.symmetric(
                                            horizontal: R.p(16),
                                          ),
                                          child: Divider(
                                            color: T.border.withOpacity(0.6),
                                            height: 1,
                                          ),
                                        ),
                                        Material(
                                          color: Colors.transparent,
                                          child: InkWell(
                                            borderRadius: BorderRadius.vertical(
                                              bottom: Radius.circular(R.r(20)),
                                            ),
                                            onTap: () =>
                                                setState(() => _showAll = true),
                                            child: Padding(
                                              padding: EdgeInsets.symmetric(
                                                vertical: R.p(14),
                                              ),
                                              child: Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment.center,
                                                children: [
                                                  Text(
                                                    'See all ${allFiltered.length} transactions',
                                                    style: TextStyle(
                                                      color: T.accent,
                                                      fontSize: R.fs(13),
                                                      fontWeight:
                                                          FontWeight.w600,
                                                    ),
                                                  ),
                                                  SizedBox(width: R.p(4)),
                                                  Icon(
                                                    Icons
                                                        .keyboard_arrow_down_rounded,
                                                    color: T.accent,
                                                    size: R.fs(16),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],

                                      if (_showAll &&
                                          allFiltered.length >
                                              _previewCount) ...[
                                        Padding(
                                          padding: EdgeInsets.symmetric(
                                            horizontal: R.p(16),
                                          ),
                                          child: Divider(
                                            color: T.border.withOpacity(0.6),
                                            height: 1,
                                          ),
                                        ),
                                        Material(
                                          color: Colors.transparent,
                                          child: InkWell(
                                            borderRadius: BorderRadius.vertical(
                                              bottom: Radius.circular(R.r(20)),
                                            ),
                                            onTap: () => setState(
                                              () => _showAll = false,
                                            ),
                                            child: Padding(
                                              padding: EdgeInsets.symmetric(
                                                vertical: R.p(14),
                                              ),
                                              child: Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment.center,
                                                children: [
                                                  Text(
                                                    'Show less',
                                                    style: TextStyle(
                                                      color: T.textSecondary,
                                                      fontSize: R.fs(13),
                                                      fontWeight:
                                                          FontWeight.w600,
                                                    ),
                                                  ),
                                                  SizedBox(width: R.p(4)),
                                                  Icon(
                                                    Icons
                                                        .keyboard_arrow_up_rounded,
                                                    color: T.textSecondary,
                                                    size: R.fs(16),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                          ),

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

  // Rest of the methods remain exactly the same
  Widget _buildShimmer() {
    return Padding(
      padding: EdgeInsets.all(R.p(20)),
      child: Column(
        children: List.generate(
          _previewCount,
          (i) => Padding(
            padding: EdgeInsets.only(bottom: R.p(16)),
            child: Row(
              children: [
                _Shimmer(width: R.p(44), height: R.p(44), radius: R.r(12)),
                SizedBox(width: R.p(12)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Shimmer(width: R.p(120), height: R.fs(14)),
                      SizedBox(height: R.p(6)),
                      _Shimmer(width: R.p(80), height: R.fs(11)),
                    ],
                  ),
                ),
                SizedBox(width: R.p(12)),
                _Shimmer(width: R.p(60), height: R.fs(14)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    final label = _filterType == 'INCOME'
        ? 'No income transactions'
        : _filterType == 'EXPENSE'
        ? 'No expense transactions'
        : 'No transactions yet';
    return Padding(
      padding: EdgeInsets.symmetric(vertical: R.p(32)),
      child: Center(
        child: Column(
          children: [
            Icon(
              _filterType == 'INCOME'
                  ? Icons.account_balance_outlined
                  : _filterType == 'EXPENSE'
                  ? Icons.receipt_long_outlined
                  : Icons.inbox_outlined,
              color: T.textMuted,
              size: R.fs(32),
            ),
            SizedBox(height: R.p(10)),
            Text(
              label,
              style: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildTxnList(List<Map<String, dynamic>> txns) {
    return List.generate(txns.length, (i) {
      final t = txns[i];
      final type = (t['type'] as String? ?? '').toUpperCase();
      final isCredit = type == 'INCOME' || type == 'CREDIT';
      final c = isCredit ? T.green : T.red;
      final amount = (t['amount'] as num?)?.toDouble() ?? 0.0;
      final category = t['category'] as String? ?? 'General';
      final description = t['description'] as String? ?? '';
      final dateRaw = t['date'] as String? ?? '';
      final isRecurring = t['isRecurring'] as bool? ?? false;

      String dateLabel = dateRaw;
      try {
        final d = DateTime.tryParse(dateRaw);
        if (d != null) {
          final now = DateTime.now();
          final diff = now.difference(d).inDays;
          if (diff == 0) {
            dateLabel = 'Today';
          } else if (diff == 1) {
            dateLabel = 'Yesterday';
          } else {
            const months = [
              '',
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ];
            dateLabel = '${d.day} ${months[d.month]} ${d.year}';
          }
        }
      } catch (_) {}

      String fmtAmount(double v) {
        if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(1)}L';
        if (v >= 1000) {
          final s = v.toStringAsFixed(0);
          final buf = StringBuffer();
          int rem = s.length % 3;
          if (rem != 0) buf.write(s.substring(0, rem));
          for (int j = rem; j < s.length; j += 3) {
            if (buf.isNotEmpty) buf.write(',');
            buf.write(s.substring(j, j + 3));
          }
          return '₹$buf';
        }
        return '₹${v.toStringAsFixed(0)}';
      }

      IconData catIcon = _catIcon(category);

      return Column(
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.vertical(
                top: i == 0 ? Radius.circular(R.r(20)) : Radius.zero,
                bottom: Radius.zero,
              ),
              onTap: () {},
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: R.p(16),
                  vertical: R.p(13),
                ),
                child: Row(
                  children: [
                    Container(
                      width: R.p(44).clamp(38.0, 50.0),
                      height: R.p(44).clamp(38.0, 50.0),
                      decoration: BoxDecoration(
                        color: c.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(R.r(12)),
                      ),
                      child: Icon(catIcon, color: c, size: R.fs(20)),
                    ),
                    SizedBox(width: R.p(12)),
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
                                    fontSize: R.fs(14),
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: -0.2,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: R.p(3)),
                          Row(
                            children: [
                              Container(
                                padding: EdgeInsets.symmetric(
                                  horizontal: R.p(6),
                                  vertical: R.p(2),
                                ),
                                decoration: BoxDecoration(
                                  color: c.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(R.r(5)),
                                ),
                                child: Text(
                                  isCredit ? 'IN' : 'OUT',
                                  style: TextStyle(
                                    color: c,
                                    fontSize: R.fs(9),
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                              ),
                              if (isRecurring) ...[
                                SizedBox(width: R.p(5)),
                                Icon(
                                  Icons.repeat_rounded,
                                  color: T.accent,
                                  size: R.fs(10),
                                ),
                              ],
                              SizedBox(width: R.p(6)),
                              Container(
                                width: 3,
                                height: 3,
                                decoration: BoxDecoration(
                                  color: T.textMuted,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              SizedBox(width: R.p(6)),
                              Text(
                                dateLabel,
                                style: TextStyle(
                                  color: T.textMuted,
                                  fontSize: R.fs(11),
                                ),
                              ),
                              if (description.isNotEmpty) ...[
                                SizedBox(width: R.p(6)),
                                Container(
                                  width: 3,
                                  height: 3,
                                  decoration: BoxDecoration(
                                    color: T.textMuted,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                SizedBox(width: R.p(6)),
                                Expanded(
                                  child: Text(
                                    description,
                                    style: TextStyle(
                                      color: T.textMuted,
                                      fontSize: R.fs(11),
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: R.p(8)),
                    Text(
                      '${isCredit ? '+' : '-'}${fmtAmount(amount)}',
                      style: TextStyle(
                        color: c,
                        fontSize: R.fs(14),
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (i < txns.length - 1)
            Padding(
              padding: EdgeInsets.symmetric(horizontal: R.p(16)),
              child: Divider(color: T.border.withOpacity(0.6), height: 1),
            ),
        ],
      );
    });
  }

  static IconData _catIcon(String cat) {
    final c = cat.toLowerCase();
    if (c.contains('food') || c.contains('dining') || c.contains('restaurant'))
      return Icons.fastfood_rounded;
    if (c.contains('salary') || c.contains('income'))
      return Icons.account_balance_rounded;
    if (c.contains('transport') || c.contains('travel'))
      return Icons.directions_car_rounded;
    if (c.contains('subscri') || c.contains('stream'))
      return Icons.play_circle_rounded;
    if (c.contains('grocer') || c.contains('super'))
      return Icons.local_grocery_store_rounded;
    if (c.contains('shop') || c.contains('cloth'))
      return Icons.shopping_bag_rounded;
    if (c.contains('medical') || c.contains('health'))
      return Icons.local_hospital_rounded;
    if (c.contains('invest')) return Icons.trending_up_rounded;
    if (c.contains('bill') || c.contains('util'))
      return Icons.receipt_long_rounded;
    if (c.contains('entertain')) return Icons.movie_rounded;
    return Icons.currency_rupee_rounded;
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
// ALL SUPPORTING WIDGETS (REMAIN THE SAME)
// ═══════════════════════════════════════════════════════════════

class _TabItem extends StatelessWidget {
  final String label;
  final int count;
  final bool active;
  final VoidCallback onTap;
  final Color color;

  const _TabItem({
    required this.label,
    required this.count,
    required this.active,
    required this.onTap,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          padding: EdgeInsets.symmetric(vertical: R.p(8)),
          decoration: BoxDecoration(
            color: active ? color.withOpacity(0.14) : Colors.transparent,
            borderRadius: BorderRadius.circular(R.r(9)),
            border: active
                ? Border.all(color: color.withOpacity(0.35), width: 1)
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: active ? color : T.textSecondary,
                  fontSize: R.fs(12),
                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
              SizedBox(width: R.p(5)),
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: R.p(5),
                  vertical: R.p(1),
                ),
                decoration: BoxDecoration(
                  color: active
                      ? color.withOpacity(0.18)
                      : T.border.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(R.r(20)),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    color: active ? color : T.textMuted,
                    fontSize: R.fs(10),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Shimmer extends StatefulWidget {
  final double width, height;
  final double? radius;
  const _Shimmer({required this.width, required this.height, this.radius});

  @override
  State<_Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<_Shimmer>
    with SingleTickerProviderStateMixin {
  late AnimationController _ac;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ac = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _anim = CurvedAnimation(parent: _ac, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ac.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Container(
        width: widget.width,
        height: widget.height + 2,
        decoration: BoxDecoration(
          color: T.border.withOpacity(0.3 + _anim.value * 0.4),
          borderRadius: BorderRadius.circular(widget.radius ?? 4),
        ),
      ),
    );
  }
}

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
    // ✅ HANDLE EMPTY ACCOUNTS
    if (accounts.isEmpty) {
      return Container(
        padding: EdgeInsets.all(R.p(14)),
        decoration: BoxDecoration(
          color: T.elevated,
          borderRadius: BorderRadius.circular(R.r(14)),
          border: Border.all(color: T.border),
        ),
        child: Text(
          'No accounts found. Please create one.',
          style: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
        ),
      );
    }

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

class _TField extends StatefulWidget {
  final TextEditingController controller;
  final String hint;
  final TextInputType keyboardType;
  final Widget? prefix;
  final Widget? suffix;
  final int maxLines;
  final VoidCallback? onTap;

  const _TField({
    required this.controller,
    required this.hint,
    required this.keyboardType,
    this.prefix,
    this.suffix,
    this.maxLines = 1,
    this.onTap,
  });

  @override
  State<_TField> createState() => _TFieldState();
}

class _TFieldState extends State<_TField> {
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
  final bool isLoading;
  const _GradientBtn({
    required this.label,
    required this.onTap,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(R.r(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.r(14)),
        onTap: isLoading ? null : onTap,
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
            child: isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : Text(
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

class _ConfirmRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _ConfirmRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 14, color: T.textMuted),
          const SizedBox(width: 6),
          Text('$label: ', style: TextStyle(color: T.textMuted, fontSize: 13)),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: T.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
