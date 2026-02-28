import 'dart:convert';

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/provider/dashboard_provider.dart';
import 'package:mobile/theme/theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum _InvestmentType { SIP, STOCKS, REAL_ESTATE, GOLD, PPF, RD, OTHER }

class _Investment {
  final String id;
  final String name;
  final _InvestmentType type;
  final double amount;
  final DateTime date;
  final String? notes;

  const _Investment({
    required this.id,
    required this.name,
    required this.type,
    required this.amount,
    required this.date,
    this.notes,
  });
}

const _kGeminiApiKey = 'AIzaSyDAYaaPaPatH60G5rM_62qzmTZULRPEKbo';
const _kGeminiModel = 'gemini-2.5-flash';
const _kGeminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/$_kGeminiModel:generateContent?key=$_kGeminiApiKey';

// ═════════════
enum _Role { user, assistant, insight }

class _ChatMessage {
  final _Role role;
  final String text;
  final DateTime time;

  _ChatMessage({required this.role, required this.text})
    : time = DateTime.now();
}

const _kSuggestions = [
  '📊 Where am I spending the most?',
  '💡 How can I save more this month?',
  '📈 How does this month compare to last?',
  '🏦 What\'s my current financial health?',
  '⚠️ Any unusual spending patterns?',
  '🎯 Set a budget recommendation for me',
  '💼 Break down my investment portfolio',
  '📉 Which investments should I review?',
];

class LearnScreen extends StatefulWidget {
  const LearnScreen({super.key});

  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen>
    with SingleTickerProviderStateMixin {
  final _scrollController = ScrollController();
  final _textController = TextEditingController();
  final _focusNode = FocusNode();

  late AnimationController _headerAc;
  late Animation<double> _headerFade;

  final List<_ChatMessage> _messages = [];
  bool _isTyping = false;
  bool _dataLoaded = false;
  bool _loadingData = true;

  // Compiled financial context sent with every Gemini request
  String _financialContext = '';

  // Conversation history for multi-turn Gemini
  final List<Map<String, dynamic>> _geminiHistory = [];

  static SupabaseClient get _db => Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _headerAc = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _headerFade = CurvedAnimation(parent: _headerAc, curve: Curves.easeOut);
    _headerAc.forward();

    WidgetsBinding.instance.addPostFrameCallback((_) => _initData());
  }

  @override
  void dispose() {
    _headerAc.dispose();
    _scrollController.dispose();
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  // ─── Data Loading ───────────────────────────────────────────

  Future<void> _initData() async {
    setState(() => _loadingData = true);

    try {
      final clerkUserId = ClerkAuth.of(context).user?.id ?? '';
      if (clerkUserId.isEmpty) {
        _financialContext = 'No authenticated user found.';
        return;
      }

      // Resolve internal UUID
      final userRows = await _db
          .from('users')
          .select('id')
          .eq('clerkUserId', clerkUserId)
          .limit(1);

      if ((userRows as List).isEmpty) {
        _financialContext = 'User profile not found.';
        return;
      }
      final internalId =
          (userRows.first as Map<String, dynamic>)['id'] as String;

      // Fetch account
      final accountRows = await _db
          .from('accounts')
          .select()
          .eq('userId', internalId)
          .order('isDefault', ascending: false)
          .limit(1);

      // Fetch all transactions (up to 200 for full AI context)
      final now = DateTime.now();
      final sixMonthsAgo = DateTime(now.year, now.month - 5, 1);
      final txnRows = await _db
          .from('transactions')
          .select()
          .eq('userId', internalId)
          .gte('date', sixMonthsAgo.toIso8601String())
          .order('date', ascending: false)
          .limit(200);

      // Fetch investments
      final List<_Investment> investments = await _fetchInvestments(
        internalId,
        clerkUserId,
      );

      _financialContext = _buildFinancialContext(
        accountRows: accountRows as List,
        txnRows: txnRows as List,
        now: now,
        investments: investments,
      );

      _dataLoaded = true;

      // Auto-send an opening insight
      await _sendInsightGreeting();
    } catch (e) {
      _financialContext = 'Error loading financial data: $e';
      _addMessage(
        _Role.assistant,
        'Sorry, I had trouble loading your financial data. Please try again.',
      );
    } finally {
      setState(() => _loadingData = false);
    }
  }

  /// Fetches investments from Supabase.
  /// Tries `userId` (internal UUID) first, then `clerkUserId` column as
  /// fallback (some schemas store clerk ID directly on the investments table).
  Future<List<_Investment>> _fetchInvestments(
    String internalId,
    String clerkUserId,
  ) async {
    // Helper that maps a Supabase row list → _Investment list
    List<_Investment> parse(List rows) => rows.map((r) {
      final m = r as Map<String, dynamic>;
      return _Investment(
        id: m['id'] as String,
        name: m['name'] as String,
        type: _parseInvestmentType(m['type'] as String? ?? 'OTHER'),
        amount: (m['amount'] as num).toDouble(),
        date: DateTime.parse(m['date'] as String),
        notes: m['notes'] as String?,
      );
    }).toList();

    // 1️⃣  Try with internal UUID (most common schema)
    try {
      final rows = await _db
          .from('investments')
          .select()
          .eq('userId', internalId)
          .order('date', ascending: false)
          .limit(100);
      final list = rows as List;
      debugPrint('[Sage] investments via internalId: ${list.length} rows');
      if (list.isNotEmpty) return parse(list);
    } catch (e) {
      debugPrint('[Sage] investments internalId query failed: $e');
    }

    // 2️⃣  Try with Clerk user ID directly
    try {
      final rows = await _db
          .from('investments')
          .select()
          .eq('userId', clerkUserId)
          .order('date', ascending: false)
          .limit(100);
      final list = rows as List;
      debugPrint('[Sage] investments via clerkUserId: ${list.length} rows');
      if (list.isNotEmpty) return parse(list);
    } catch (e) {
      debugPrint('[Sage] investments clerkUserId query failed: $e');
    }

    // No investments found — return empty list
    debugPrint('[Sage] no investments found for user');
    return [];
  }

  static _InvestmentType _parseInvestmentType(String raw) {
    switch (raw.toUpperCase()) {
      case 'SIP':
        return _InvestmentType.SIP;
      case 'STOCKS':
        return _InvestmentType.STOCKS;
      case 'REAL_ESTATE':
        return _InvestmentType.REAL_ESTATE;
      case 'GOLD':
        return _InvestmentType.GOLD;
      case 'PPF':
        return _InvestmentType.PPF;
      case 'RD':
        return _InvestmentType.RD;
      default:
        return _InvestmentType.OTHER;
    }
  }

  static String _labelForInvestmentType(_InvestmentType t) {
    switch (t) {
      case _InvestmentType.STOCKS:
        return 'Stocks';
      case _InvestmentType.REAL_ESTATE:
        return 'Real Estate';
      case _InvestmentType.GOLD:
        return 'Gold';
      case _InvestmentType.PPF:
        return 'PPF';
      case _InvestmentType.RD:
        return 'Recurring Deposit';
      case _InvestmentType.SIP:
        return 'SIP / Mutual Fund';
      case _InvestmentType.OTHER:
        return 'Other';
    }
  }

  /// Builds a rich plain-text financial summary for the AI system prompt,
  /// now including the full savings / investment portfolio section.
  String _buildFinancialContext({
    required List accountRows,
    required List txnRows,
    required List<_Investment> investments,
    required DateTime now,
  }) {
    final buf = StringBuffer();

    // ── Account ──────────────────────────────────────────────
    if (accountRows.isNotEmpty) {
      final a = accountRows.first as Map<String, dynamic>;
      buf.writeln('=== ACCOUNT ===');
      buf.writeln('Name: ${a['name']}');
      buf.writeln('Type: ${a['type']}');
      buf.writeln(
        'Balance: ₹${(a['balance'] as num?)?.toStringAsFixed(2) ?? '0.00'}',
      );
      buf.writeln();
    }

    // ── Parse all transactions ───────────────────────────────
    final allTxns = txnRows
        .map((r) => TransactionModel.fromMap(r as Map<String, dynamic>))
        .toList();

    final thisMonthStart = DateTime(now.year, now.month, 1);
    final lastMonthStart = DateTime(now.year, now.month - 1, 1);

    final thisMonth = allTxns
        .where((t) => !t.date.isBefore(thisMonthStart))
        .toList();
    final lastMonth = allTxns
        .where(
          (t) =>
              !t.date.isBefore(lastMonthStart) &&
              t.date.isBefore(thisMonthStart),
        )
        .toList();

    // This month summary
    final income = thisMonth
        .where((t) => t.isCredit)
        .fold(0.0, (s, t) => s + t.amount);
    final expense = thisMonth
        .where((t) => !t.isCredit)
        .fold(0.0, (s, t) => s + t.amount);
    final saved = (income - expense).clamp(0.0, double.infinity);

    buf.writeln(
      '=== THIS MONTH SUMMARY (${_monthName(now.month)} ${now.year}) ===',
    );
    buf.writeln('Total Income: ₹${income.toStringAsFixed(2)}');
    buf.writeln('Total Expenses: ₹${expense.toStringAsFixed(2)}');
    buf.writeln('Net Saved: ₹${saved.toStringAsFixed(2)}');
    buf.writeln();

    // Last month summary
    final lIncome = lastMonth
        .where((t) => t.isCredit)
        .fold(0.0, (s, t) => s + t.amount);
    final lExpense = lastMonth
        .where((t) => !t.isCredit)
        .fold(0.0, (s, t) => s + t.amount);
    buf.writeln(
      '=== LAST MONTH SUMMARY (${_monthName(lastMonthStart.month)} ${lastMonthStart.year}) ===',
    );
    buf.writeln('Total Income: ₹${lIncome.toStringAsFixed(2)}');
    buf.writeln('Total Expenses: ₹${lExpense.toStringAsFixed(2)}');
    buf.writeln();

    // Expense by category this month
    final Map<String, double> catMap = {};
    for (final t in thisMonth.where((t) => !t.isCredit)) {
      catMap[t.category] = (catMap[t.category] ?? 0) + t.amount;
    }
    if (catMap.isNotEmpty) {
      buf.writeln('=== EXPENSE BREAKDOWN BY CATEGORY (THIS MONTH) ===');
      final sorted = catMap.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));
      for (final e in sorted) {
        final pct = expense > 0
            ? (e.value / expense * 100).toStringAsFixed(1)
            : '0';
        buf.writeln('${e.key}: ₹${e.value.toStringAsFixed(2)} ($pct%)');
      }
      buf.writeln();
    }

    // All transactions (recent 50 for AI context)
    buf.writeln('=== RECENT TRANSACTIONS (up to 50) ===');
    final sample = allTxns.take(50).toList();
    for (final t in sample) {
      final type = t.isCredit ? 'INCOME' : 'EXPENSE';
      buf.writeln(
        '${t.date.toIso8601String().substring(0, 10)} | $type | ${t.category} | ₹${t.amount.toStringAsFixed(2)} | ${t.title}',
      );
    }
    buf.writeln();

    // ── Investment / Savings Portfolio ───────────────────────
    _appendInvestmentContext(buf, investments);

    return buf.toString();
  }

  /// Appends a detailed investment portfolio section to the context buffer.
  void _appendInvestmentContext(
    StringBuffer buf,
    List<_Investment> investments,
  ) {
    if (investments.isEmpty) return;

    final total = investments.fold(0.0, (s, inv) => s + inv.amount);

    buf.writeln('=== INVESTMENT PORTFOLIO ===');
    buf.writeln('Total Investments: ${investments.length}');
    buf.writeln('Total Portfolio Value: ₹${_fmtRaw(total)}');
    buf.writeln();

    // Per-investment rows
    buf.writeln('--- Individual Holdings ---');
    for (final inv in investments) {
      final pct = total > 0
          ? (inv.amount / total * 100).toStringAsFixed(1)
          : '0.0';
      final dateStr = inv.date.toIso8601String().substring(0, 10);
      buf.writeln(
        '${inv.name} | ${_labelForInvestmentType(inv.type)} | ₹${_fmtRaw(inv.amount)} ($pct% of portfolio) | Added: $dateStr',
      );
      if (inv.notes != null && inv.notes!.isNotEmpty) {
        buf.writeln('  Notes: ${inv.notes}');
      }
    }
    buf.writeln();

    // Allocation by type
    final Map<_InvestmentType, double> grouped = {};
    for (final inv in investments) {
      grouped[inv.type] = (grouped[inv.type] ?? 0) + inv.amount;
    }
    final sortedGroups = grouped.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    buf.writeln('--- Allocation by Asset Class ---');
    for (final e in sortedGroups) {
      final pct = (e.value / total * 100).toStringAsFixed(1);
      buf.writeln(
        '${_labelForInvestmentType(e.key)}: ₹${_fmtRaw(e.value)} ($pct%)',
      );
    }
    buf.writeln();

    // Dominant asset class
    if (sortedGroups.isNotEmpty) {
      final top = sortedGroups.first;
      buf.writeln(
        'Largest allocation: ${_labelForInvestmentType(top.key)} at ${(top.value / total * 100).toStringAsFixed(1)}% of portfolio.',
      );
    }
    buf.writeln();
  }

  /// Returns a raw numeric string with two decimal places (no abbreviation),
  /// so the AI gets exact numbers to reason about.
  static String _fmtRaw(double v) => v.toStringAsFixed(2);

  static String _monthName(int m) => const [
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
  ][m];

  // ─── Gemini API ─────────────────────────────────────────────

  String get _systemPrompt =>
      '''
You are "Sage", a professional financial adviser. Use only the real financial data provided below to answer user questions.

Guidelines:
- Respond precisely and efficiently, using clear bullet points or brief paragraphs.
- Give practical, actionable advice and insights for the user's personal finances.
- Use Indian number formatting (₹, L for lakhs, Cr for crores).
- Never fabricate or assume data; rely strictly on the provided information.
- When discussing trends, compare relevant months from the data.
- When asked about investments or savings, refer to the INVESTMENT PORTFOLIO section.
- When asked about overall net worth, combine account balance with total portfolio value.

Here is the user's current financial data:

$_financialContext
''';

  Future<String> _callGemini(String userMessage) async {
    // Build the contents array (multi-turn)
    final contents = [
      ..._geminiHistory,
      {
        'role': 'user',
        'parts': [
          {'text': userMessage},
        ],
      },
    ];

    final body = jsonEncode({
      'system_instruction': {
        'parts': [
          {'text': _systemPrompt},
        ],
      },
      'contents': contents,
      'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 800},
    });

    final response = await http.post(
      Uri.parse(_kGeminiUrl),
      headers: {'Content-Type': 'application/json'},
      body: body,
    );

    if (response.statusCode != 200) {
      throw Exception('Gemini error ${response.statusCode}: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final candidates = json['candidates'] as List?;
    final parts =
        (candidates != null &&
            candidates.isNotEmpty &&
            (candidates[0] as Map<String, dynamic>)['content'] != null)
        ? ((candidates[0] as Map<String, dynamic>)['content']['parts'] as List?)
        : null;
    final text =
        (parts != null && parts.isNotEmpty
            ? (parts[0] as Map<String, dynamic>)['text'] as String?
            : null) ??
        'Sorry, I couldn\'t generate a response.';

    // Persist turn in history
    _geminiHistory.addAll([
      {
        'role': 'user',
        'parts': [
          {'text': userMessage},
        ],
      },
      {
        'role': 'model',
        'parts': [
          {'text': text},
        ],
      },
    ]);

    return text;
  }

  // ─── Greeting insight on load ────────────────────────────────

  Future<void> _sendInsightGreeting() async {
    setState(() => _isTyping = true);
    try {
      final greeting = await _callGemini(
        'Give me a brief (4-5 bullet points) financial health summary based on my data. '
        'Include one bullet specifically about my investment portfolio (total value and top allocation). '
        'Start with a warm one-line greeting. Be specific with numbers.',
      );
      _addMessage(_Role.insight, greeting);
    } catch (_) {
      _addMessage(
        _Role.insight,
        '👋 Hi! I\'m Sage, your personal finance assistant. Ask me anything about your spending, savings, investments, or financial goals!',
      );
    } finally {
      setState(() => _isTyping = false);
    }
  }

  // ─── Send message ────────────────────────────────────────────

  Future<void> _sendMessage(String text) async {
    final msg = text.trim();
    if (msg.isEmpty || _isTyping) return;

    _textController.clear();
    _addMessage(_Role.user, msg);
    setState(() => _isTyping = true);
    _scrollToBottom();

    try {
      final reply = await _callGemini(msg);
      _addMessage(_Role.assistant, reply);
    } catch (e) {
      _addMessage(
        _Role.assistant,
        'Sorry, something went wrong. Please check your connection and try again.\n\nError: $e',
      );
    } finally {
      setState(() => _isTyping = false);
      _scrollToBottom();
    }
  }

  void _addMessage(_Role role, String text) {
    setState(() => _messages.add(_ChatMessage(role: role, text: text)));
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // ─── Build ───────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    R.init(context);
    final notifier = ThemeProvider.of(context);
    T.init(notifier.isDark);

    return Scaffold(
      backgroundColor: T.surface,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: _loadingData
                  ? _buildLoadingState()
                  : Column(
                      children: [
                        Expanded(child: _buildMessageList()),
                        if (_messages.isEmpty || _messages.length <= 1)
                          _buildSuggestions(),
                        _buildInputBar(),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return FadeTransition(
      opacity: _headerFade,
      child: Container(
        padding: EdgeInsets.fromLTRB(R.p(20), R.p(14), R.p(20), R.p(14)),
        decoration: BoxDecoration(
          color: T.surface,
          border: Border(bottom: BorderSide(color: T.border, width: 1)),
        ),
        child: Row(
          children: [
            // Sage avatar
            Container(
              width: R.p(40),
              height: R.p(40),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [T.accent, T.accentSoft],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(R.r(14)),
                boxShadow: [
                  BoxShadow(
                    color: T.accent.withOpacity(0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  '✦',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: R.fs(18),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
            SizedBox(width: R.p(12)),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Sage',
                        style: TextStyle(
                          color: T.textPrimary,
                          fontSize: R.fs(16),
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.3,
                        ),
                      ),
                      SizedBox(width: R.p(8)),
                    ],
                  ),
                  SizedBox(height: R.p(2)),
                  Text(
                    _dataLoaded
                        ? 'Your financial data is loaded'
                        : 'Loading your financial data...',
                    style: TextStyle(color: T.textMuted, fontSize: R.fs(11)),
                  ),
                ],
              ),
            ),
            // Clear chat
            if (_messages.isNotEmpty)
              GestureDetector(
                onTap: _clearChat,
                child: Container(
                  padding: EdgeInsets.all(R.p(8)),
                  decoration: BoxDecoration(
                    color: T.elevated,
                    borderRadius: BorderRadius.circular(R.r(10)),
                    border: Border.all(color: T.border, width: 1),
                  ),
                  child: Icon(
                    Icons.refresh_rounded,
                    color: T.textSecondary,
                    size: R.fs(16),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _clearChat() {
    setState(() {
      _messages.clear();
      _geminiHistory.clear();
    });
    _sendInsightGreeting();
  }

  // ─── Loading state ───────────────────────────────────────────

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: R.p(40),
            height: R.p(40),
            child: CircularProgressIndicator(color: T.accent, strokeWidth: 2.5),
          ),
          SizedBox(height: R.p(16)),
          Text(
            'Loading your financial data...',
            style: TextStyle(color: T.textSecondary, fontSize: R.fs(14)),
          ),
          SizedBox(height: R.p(6)),
          Text(
            'Sage is getting ready for you',
            style: TextStyle(color: T.textMuted, fontSize: R.fs(12)),
          ),
        ],
      ),
    );
  }

  // ─── Message list ────────────────────────────────────────────

  Widget _buildMessageList() {
    if (_messages.isEmpty && !_isTyping) {
      return _buildEmptyState();
    }

    return ListView.builder(
      controller: _scrollController,
      padding: EdgeInsets.fromLTRB(R.p(16), R.p(16), R.p(16), R.p(8)),
      itemCount: _messages.length + (_isTyping ? 1 : 0),
      itemBuilder: (_, i) {
        if (i == _messages.length) return _buildTypingIndicator();
        return _buildMessageBubble(_messages[i]);
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: R.p(64),
            height: R.p(64),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  T.accent.withOpacity(0.2),
                  T.accentSoft.withOpacity(0.1),
                ],
              ),
              borderRadius: BorderRadius.circular(R.r(22)),
            ),
            child: Center(
              child: Text(
                '✦',
                style: TextStyle(fontSize: R.fs(28), color: T.accent),
              ),
            ),
          ),
          SizedBox(height: R.p(16)),
          Text(
            'Ask Sage anything',
            style: TextStyle(
              color: T.textPrimary,
              fontSize: R.fs(18),
              fontWeight: FontWeight.w700,
            ),
          ),
          SizedBox(height: R.p(6)),
          Text(
            'Your personal finance AI,\ntrained on your real data',
            textAlign: TextAlign.center,
            style: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(_ChatMessage msg) {
    final isUser = msg.role == _Role.user;
    final isInsight = msg.role == _Role.insight;

    if (isInsight) {
      return Padding(
        padding: EdgeInsets.only(bottom: R.p(12)),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(R.p(16)),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                T.accent.withOpacity(0.10),
                T.accentSoft.withOpacity(0.06),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(R.r(18)),
            border: Border.all(color: T.accent.withOpacity(0.25), width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '✦',
                    style: TextStyle(color: T.accent, fontSize: R.fs(12)),
                  ),
                  SizedBox(width: R.p(6)),
                  Text(
                    'Financial Insight',
                    style: TextStyle(
                      color: T.accent,
                      fontSize: R.fs(11),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              SizedBox(height: R.p(8)),
              _MarkdownText(text: msg.text, color: T.textPrimary),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: EdgeInsets.only(bottom: R.p(10)),
      child: Row(
        mainAxisAlignment: isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            Container(
              width: R.p(28),
              height: R.p(28),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [T.accent, T.accentSoft]),
                borderRadius: BorderRadius.circular(R.r(9)),
              ),
              child: Center(
                child: Text(
                  '✦',
                  style: TextStyle(color: Colors.white, fontSize: R.fs(11)),
                ),
              ),
            ),
            SizedBox(width: R.p(8)),
          ],
          Flexible(
            child: GestureDetector(
              onLongPress: () {
                Clipboard.setData(ClipboardData(text: msg.text));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Copied to clipboard'),
                    backgroundColor: T.accent,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                );
              },
              child: Container(
                padding: EdgeInsets.symmetric(
                  horizontal: R.p(14),
                  vertical: R.p(12),
                ),
                decoration: BoxDecoration(
                  color: isUser ? T.accent : T.surface,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(R.r(18)),
                    topRight: Radius.circular(R.r(18)),
                    bottomLeft: Radius.circular(isUser ? R.r(18) : R.r(4)),
                    bottomRight: Radius.circular(isUser ? R.r(4) : R.r(18)),
                  ),
                  border: isUser ? null : Border.all(color: T.border, width: 1),
                  boxShadow: [
                    BoxShadow(
                      color: (isUser ? T.accent : T.border).withOpacity(0.15),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: isUser
                    ? Text(
                        msg.text,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: R.fs(14),
                          height: 1.45,
                        ),
                      )
                    : _MarkdownText(text: msg.text, color: T.textPrimary),
              ),
            ),
          ),
          if (isUser) SizedBox(width: R.p(8)),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: EdgeInsets.only(bottom: R.p(10)),
      child: Row(
        children: [
          Container(
            width: R.p(28),
            height: R.p(28),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [T.accent, T.accentSoft]),
              borderRadius: BorderRadius.circular(R.r(9)),
            ),
            child: Center(
              child: Text(
                '✦',
                style: TextStyle(color: Colors.white, fontSize: R.fs(11)),
              ),
            ),
          ),
          SizedBox(width: R.p(8)),
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: R.p(16),
              vertical: R.p(12),
            ),
            decoration: BoxDecoration(
              color: T.surface,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(R.r(18)),
                topRight: Radius.circular(R.r(18)),
                bottomLeft: Radius.circular(R.r(4)),
                bottomRight: Radius.circular(R.r(18)),
              ),
              border: Border.all(color: T.border, width: 1),
            ),
            child: _TypingDots(),
          ),
        ],
      ),
    );
  }

  // ─── Suggestions ─────────────────────────────────────────────

  Widget _buildSuggestions() {
    return SizedBox(
      height: R.p(40),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: R.p(16)),
        itemCount: _kSuggestions.length,
        separatorBuilder: (_, __) => SizedBox(width: R.p(8)),
        itemBuilder: (_, i) {
          final s = _kSuggestions[i];
          return GestureDetector(
            onTap: () => _sendMessage(s),
            child: Container(
              padding: EdgeInsets.symmetric(
                horizontal: R.p(14),
                vertical: R.p(8),
              ),
              decoration: BoxDecoration(
                color: T.surface,
                borderRadius: BorderRadius.circular(R.r(20)),
                border: Border.all(color: T.accent.withOpacity(0.3), width: 1),
              ),
              child: Text(
                s,
                style: TextStyle(
                  color: T.accent,
                  fontSize: R.fs(12),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ─── Input bar ───────────────────────────────────────────────

  Widget _buildInputBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(R.p(16), R.p(10), R.p(16), R.p(16)),
      decoration: BoxDecoration(
        color: T.surface,
        border: Border(top: BorderSide(color: T.border, width: 1)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: T.elevated,
                borderRadius: BorderRadius.circular(R.r(16)),
                border: Border.all(color: T.border, width: 1),
              ),
              child: TextField(
                controller: _textController,
                focusNode: _focusNode,
                style: TextStyle(color: T.textPrimary, fontSize: R.fs(14)),
                maxLines: 4,
                minLines: 1,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: 'Ask about your finances...',
                  hintStyle: TextStyle(color: T.textMuted, fontSize: R.fs(14)),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: R.p(14),
                    vertical: R.p(12),
                  ),
                ),
                onSubmitted: (v) => _sendMessage(v),
              ),
            ),
          ),
          SizedBox(width: R.p(10)),
          GestureDetector(
            onTap: () => _sendMessage(_textController.text),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: R.p(46),
              height: R.p(46),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: _isTyping
                      ? [T.border, T.border]
                      : [T.accent, T.accentSoft],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(R.r(14)),
                boxShadow: _isTyping
                    ? []
                    : [
                        BoxShadow(
                          color: T.accent.withOpacity(0.35),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
              ),
              child: Icon(
                _isTyping
                    ? Icons.hourglass_top_rounded
                    : Icons.arrow_upward_rounded,
                color: Colors.white,
                size: R.fs(20),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// SIMPLE MARKDOWN TEXT RENDERER
// ═══════════════════════════════════════════════════════════════
class _MarkdownText extends StatelessWidget {
  final String text;
  final Color color;
  const _MarkdownText({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    final lines = text.split('\n');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: lines.map((line) {
        final trimmed = line.trim();
        if (trimmed.isEmpty) return SizedBox(height: R.p(4));

        final isBullet =
            trimmed.startsWith('* ') ||
            trimmed.startsWith('- ') ||
            trimmed.startsWith('• ');
        final content = isBullet ? trimmed.substring(2).trim() : trimmed;

        return Padding(
          padding: EdgeInsets.only(bottom: R.p(3)),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isBullet) ...[
                Padding(
                  padding: EdgeInsets.only(top: R.p(5), right: R.p(6)),
                  child: Container(
                    width: 5,
                    height: 5,
                    decoration: BoxDecoration(
                      color: T.accent,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
              Expanded(child: _buildRichLine(content)),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildRichLine(String line) {
    final spans = <TextSpan>[];
    final regex = RegExp(r'\*\*(.+?)\*\*');
    int cursor = 0;

    for (final match in regex.allMatches(line)) {
      if (match.start > cursor) {
        spans.add(
          TextSpan(
            text: line.substring(cursor, match.start),
            style: TextStyle(color: color, fontSize: R.fs(14), height: 1.5),
          ),
        );
      }
      spans.add(
        TextSpan(
          text: match.group(1),
          style: TextStyle(
            color: color,
            fontSize: R.fs(14),
            fontWeight: FontWeight.w700,
            height: 1.5,
          ),
        ),
      );
      cursor = match.end;
    }

    if (cursor < line.length) {
      spans.add(
        TextSpan(
          text: line.substring(cursor),
          style: TextStyle(color: color, fontSize: R.fs(14), height: 1.5),
        ),
      );
    }

    if (spans.isEmpty) {
      spans.add(
        TextSpan(
          text: line,
          style: TextStyle(color: color, fontSize: R.fs(14), height: 1.5),
        ),
      );
    }

    return RichText(text: TextSpan(children: spans));
  }
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED TYPING DOTS
// ═══════════════════════════════════════════════════════════════
class _TypingDots extends StatefulWidget {
  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots>
    with SingleTickerProviderStateMixin {
  late AnimationController _ac;

  @override
  void initState() {
    super.initState();
    _ac = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _ac.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ac,
      builder: (_, __) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final delay = i / 3;
            final phase = ((_ac.value - delay) % 1.0 + 1.0) % 1.0;
            final opacity = phase < 0.5 ? phase * 2 : 1.0 - (phase - 0.5) * 2;
            return Padding(
              padding: EdgeInsets.only(right: i < 2 ? R.p(4) : 0),
              child: Opacity(
                opacity: 0.3 + opacity * 0.7,
                child: Container(
                  width: R.p(7),
                  height: R.p(7),
                  decoration: BoxDecoration(
                    color: T.accent,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
