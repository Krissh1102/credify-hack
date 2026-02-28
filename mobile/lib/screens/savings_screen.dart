import 'dart:math' as math;

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/theme/theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// ═══════════════════════════════════════════════════════════════
// DATA MODEL — Investment entry (from Supabase "investments" table)
// ═══════════════════════════════════════════════════════════════
enum InvestmentType {
  SIP,
  STOCKS,
  REAL_ESTATE,
  GOLD,
  PPF,
  RD,
  CRYPTO,
  MUTUAL_FUNDS,
  OTHER,
}

class Investment {
  final String id;
  final String name;
  final InvestmentType type;
  final double amount;
  final DateTime date;
  final String? notes;

  const Investment({
    required this.id,
    required this.name,
    required this.type,
    required this.amount,
    required this.date,
    this.notes,
  });

  static InvestmentType parseType(String raw) {
    switch (raw.toUpperCase()) {
      case 'SIP':
        return InvestmentType.SIP;
      case 'STOCKS':
        return InvestmentType.STOCKS;
      case 'REAL_ESTATE':
        return InvestmentType.REAL_ESTATE;
      case 'GOLD':
        return InvestmentType.GOLD;
      case 'PPF':
        return InvestmentType.PPF;
      case 'RD':
        return InvestmentType.RD;
      case 'CRYPTO':
        return InvestmentType.CRYPTO;
      case 'MUTUAL_FUNDS':
        return InvestmentType.MUTUAL_FUNDS;
      default:
        return InvestmentType.OTHER;
    }
  }

  factory Investment.fromMap(Map<String, dynamic> m) => Investment(
    id: m['id'] as String,
    name: m['name'] as String,
    type: Investment.parseType(m['type'] as String? ?? 'OTHER'),
    amount: (m['amount'] as num).toDouble(),
    date: DateTime.parse(m['date'] as String),
    notes: m['notes'] as String?,
  );
}

// ═══════════════════════════════════════════════════════════════
// SAVINGS SCREEN — Financial Calculator + Insights & Graphs
// ═══════════════════════════════════════════════════════════════
class SavingsScreen extends StatefulWidget {
  const SavingsScreen({super.key});

  @override
  State<SavingsScreen> createState() => _SavingsScreenState();
}

class _SavingsScreenState extends State<SavingsScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ac;
  late Animation<double> _fade;
  late Animation<Offset> _slide;

  // Dropdown
  String _selectedType = 'SIP / Mutual Fund';
  static const _investmentTypes = [
    'SIP / Mutual Fund',
    'Fixed Deposit',
    'PPF',
    'Recurring Deposit',
    'Stock Portfolio',
    'Real Estate',
  ];

  // Calculator inputs
  final _amountCtrl = TextEditingController();
  final _percentCtrl = TextEditingController();
  final _yearsCtrl = TextEditingController();
  bool _dropdownOpen = false;

  // Results
  double? _maturityAmount;
  double? _totalInvested;
  double? _totalGain;
  List<_ChartPoint> _chartPoints = [];

  // Portfolio — loaded from Supabase
  List<Investment> _investments = [];
  bool _loadingInvestments = true;
  String? _loadError;

  static SupabaseClient get _db => Supabase.instance.client;

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

    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInvestments());
  }

  @override
  void dispose() {
    _ac.dispose();
    _amountCtrl.dispose();
    _percentCtrl.dispose();
    _yearsCtrl.dispose();
    super.dispose();
  }

  // ─── Supabase data fetching ───────────────────────────────────

  Future<void> _loadInvestments() async {
    setState(() {
      _loadingInvestments = true;
      _loadError = null;
    });

    try {
      final clerkUserId = ClerkAuth.of(context).user?.id ?? '';
      if (clerkUserId.isEmpty) {
        setState(() {
          _loadError = 'Not authenticated.';
          _loadingInvestments = false;
        });
        return;
      }

      // Resolve internal UUID from clerk user ID
      final userRows = await _db
          .from('users')
          .select('id')
          .eq('clerkUserId', clerkUserId)
          .limit(1);

      if ((userRows as List).isEmpty) {
        setState(() {
          _loadError = 'User profile not found.';
          _loadingInvestments = false;
        });
        return;
      }

      final internalId =
          (userRows.first as Map<String, dynamic>)['id'] as String;

      // Try with internal UUID first
      List<Investment> fetched = await _fetchByUserId(internalId);

      // Fallback: try with clerk user ID directly
      if (fetched.isEmpty) {
        fetched = await _fetchByUserId(clerkUserId);
      }

      setState(() {
        _investments = fetched;
        _loadingInvestments = false;
      });
    } catch (e) {
      debugPrint('[SavingsScreen] error loading investments: $e');
      setState(() {
        _loadError = 'Failed to load investments.';
        _loadingInvestments = false;
      });
    }
  }

  Future<List<Investment>> _fetchByUserId(String userId) async {
    try {
      final rows = await _db
          .from('investments')
          .select()
          .eq('userId', userId)
          .order('date', ascending: false)
          .limit(100);
      final list = rows as List;
      if (list.isNotEmpty) {
        return list
            .map((r) => Investment.fromMap(r as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint('[SavingsScreen] fetchByUserId($userId) failed: $e');
    }
    return [];
  }

  // ─── Calculator ──────────────────────────────────────────────

  void _calculate() {
    FocusScope.of(context).unfocus();
    final principal = double.tryParse(_amountCtrl.text) ?? 0;
    final rate = double.tryParse(_percentCtrl.text) ?? 0;
    final years = int.tryParse(_yearsCtrl.text) ?? 0;

    if (principal <= 0 || rate <= 0 || years <= 0) return;

    HapticFeedback.lightImpact();

    final List<_ChartPoint> pts = [];
    double maturity;
    double invested;

    if (_selectedType == 'SIP / Mutual Fund' ||
        _selectedType == 'Recurring Deposit') {
      final r = rate / 100 / 12;
      final n = years * 12;
      maturity = principal * ((math.pow(1 + r, n) - 1) / r) * (1 + r);
      invested = principal * n;
      for (int y = 1; y <= years; y++) {
        final ny = y * 12;
        final m = principal * ((math.pow(1 + r, ny) - 1) / r) * (1 + r);
        pts.add(_ChartPoint(y, m));
      }
    } else {
      final r = rate / 100;
      maturity = principal * math.pow(1 + r, years);
      invested = principal;
      for (int y = 1; y <= years; y++) {
        pts.add(_ChartPoint(y, principal * math.pow(1 + r, y)));
      }
    }

    setState(() {
      _maturityAmount = maturity;
      _totalInvested = invested;
      _totalGain = maturity - invested;
      _chartPoints = pts;
    });
  }

  /// Total portfolio value across all investments
  double get _portfolioTotal =>
      _investments.fold(0, (sum, inv) => sum + inv.amount);

  // ─── Add investment (persists to Supabase) ───────────────────

  Future<void> _addInvestmentToSupabase(Investment inv) async {
    try {
      final clerkUserId = ClerkAuth.of(context).user?.id ?? '';
      if (clerkUserId.isEmpty) return;

      final userRows = await _db
          .from('users')
          .select('id')
          .eq('clerkUserId', clerkUserId)
          .limit(1);

      if ((userRows as List).isEmpty) return;
      final internalId =
          (userRows.first as Map<String, dynamic>)['id'] as String;

      await _db.from('investments').insert({
        'id': inv.id,
        'userId': internalId,
        'name': inv.name,
        'type': inv.type.name,
        'amount': inv.amount,
        'date': inv.date.toIso8601String(),
        'notes': inv.notes,
      });
    } catch (e) {
      debugPrint('[SavingsScreen] insert investment failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    R.init(context);
    final notifier = ThemeProvider.of(context);
    T.init(notifier.isDark);

    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: _slide,
        child: GestureDetector(
          onTap: () {
            FocusScope.of(context).unfocus();
            if (_dropdownOpen) setState(() => _dropdownOpen = false);
          },
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
                  R.p(24),
                ),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    // ── My Portfolio Card ──────────────────────
                    _SCard(
                      child: _loadingInvestments
                          ? _buildPortfolioLoading()
                          : _loadError != null
                          ? _buildPortfolioError()
                          : _buildPortfolioContent(),
                    ),

                    SizedBox(height: R.p(16)),

                    // ── Financial Calculator Type Card ─────────
                    _SCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            'Financial Calculator',
                            style: TextStyle(
                              color: T.textPrimary,
                              fontSize: R.fs(16),
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.4,
                            ),
                          ),
                          SizedBox(height: R.p(16)),
                          _InvestmentDropdown(
                            value: _selectedType,
                            items: _investmentTypes,
                            isOpen: _dropdownOpen,
                            onToggle: () =>
                                setState(() => _dropdownOpen = !_dropdownOpen),
                            onSelect: (v) => setState(() {
                              _selectedType = v;
                              _dropdownOpen = false;
                            }),
                          ),
                        ],
                      ),
                    ),

                    SizedBox(height: R.p(16)),

                    // ── Calculator Inputs Card ─────────────────
                    _SCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Center(
                            child: Text(
                              'Calculator',
                              style: TextStyle(
                                color: T.textPrimary,
                                fontSize: R.fs(16),
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.4,
                              ),
                            ),
                          ),
                          SizedBox(height: R.p(20)),
                          _CalcField(
                            label:
                                _selectedType == 'SIP / Mutual Fund' ||
                                    _selectedType == 'Recurring Deposit'
                                ? 'Monthly Amount (₹)'
                                : 'Principal Amount (₹)',
                            hint: 'e.g. 5000',
                            controller: _amountCtrl,
                            keyboardType: TextInputType.number,
                          ),
                          SizedBox(height: R.p(14)),
                          _CalcField(
                            label: 'Expected Return (%)',
                            hint: 'e.g. 12',
                            controller: _percentCtrl,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                          ),
                          SizedBox(height: R.p(14)),
                          _CalcField(
                            label: 'Time Period (Years)',
                            hint: 'e.g. 10',
                            controller: _yearsCtrl,
                            keyboardType: TextInputType.number,
                          ),
                          SizedBox(height: R.p(22)),
                          Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(R.r(14)),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(R.r(14)),
                              onTap: _calculate,
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
                                      blurRadius: 20,
                                      offset: const Offset(0, 6),
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: Text(
                                    'Calculate',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: R.fs(15),
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    SizedBox(height: R.p(16)),

                    // ── Insights & Graphs Card ─────────────────
                    _SCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Center(
                            child: Text(
                              'Insights & Graphs',
                              style: TextStyle(
                                color: T.textPrimary,
                                fontSize: R.fs(16),
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.4,
                              ),
                            ),
                          ),
                          SizedBox(height: R.p(16)),

                          if (_maturityAmount == null) ...[
                            Container(
                              height: R.p(80).clamp(70.0, 100.0),
                              decoration: BoxDecoration(
                                color: T.elevated,
                                borderRadius: BorderRadius.circular(R.r(14)),
                                border: Border.all(color: T.border, width: 1),
                              ),
                              child: Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.insert_chart_outlined_rounded,
                                      color: T.textMuted,
                                      size: R.fs(28),
                                    ),
                                    SizedBox(height: R.p(6)),
                                    Text(
                                      'Enter values and press Calculate',
                                      style: TextStyle(
                                        color: T.textMuted,
                                        fontSize: R.fs(12),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            SizedBox(height: R.p(12)),
                            Container(
                              height: R.p(60).clamp(52.0, 72.0),
                              decoration: BoxDecoration(
                                color: T.elevated,
                                borderRadius: BorderRadius.circular(R.r(14)),
                                border: Border.all(color: T.border, width: 1),
                              ),
                            ),
                          ] else ...[
                            Row(
                              children: [
                                _ResultPill(
                                  'Invested',
                                  _fmt(_totalInvested!),
                                  T.accent,
                                ),
                                SizedBox(width: R.p(10)),
                                _ResultPill('Gain', _fmt(_totalGain!), T.green),
                                SizedBox(width: R.p(10)),
                                _ResultPill(
                                  'Maturity',
                                  _fmt(_maturityAmount!),
                                  T.gold,
                                ),
                              ],
                            ),
                            SizedBox(height: R.p(20)),
                            Text(
                              'Growth Over Time',
                              style: TextStyle(
                                color: T.textSecondary,
                                fontSize: R.fs(12),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            SizedBox(height: R.p(10)),
                            SizedBox(
                              height: R.h(22).clamp(140.0, 200.0),
                              child: CustomPaint(
                                painter: _LineChartPainter(
                                  points: _chartPoints,
                                  lineColor: T.accent,
                                  fillColor: T.accent.withOpacity(0.15),
                                  gridColor: T.border.withOpacity(0.5),
                                  labelColor: T.textMuted,
                                ),
                                size: Size.infinite,
                              ),
                            ),
                            SizedBox(height: R.p(20)),
                            Text(
                              'Invested vs Returns',
                              style: TextStyle(
                                color: T.textSecondary,
                                fontSize: R.fs(12),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            SizedBox(height: R.p(12)),
                            _InvestedVsReturnDonut(
                              invested: _totalInvested!,
                              gain: _totalGain!,
                            ),
                            SizedBox(height: R.p(20)),
                            _AiTip(
                              _selectedType,
                              _maturityAmount!,
                              _totalGain!,
                              _totalInvested!,
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
    );
  }

  // ─── Portfolio card states ─────────────────────────────────

  Widget _buildPortfolioLoading() {
    return SizedBox(
      height: R.p(120),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: T.accent, strokeWidth: 2.5),
            SizedBox(height: R.p(12)),
            Text(
              'Loading your portfolio...',
              style: TextStyle(color: T.textMuted, fontSize: R.fs(12)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPortfolioError() {
    return SizedBox(
      height: R.p(100),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline_rounded,
              color: T.textMuted,
              size: R.fs(28),
            ),
            SizedBox(height: R.p(8)),
            Text(
              _loadError ?? 'Something went wrong.',
              style: TextStyle(color: T.textMuted, fontSize: R.fs(12)),
            ),
            SizedBox(height: R.p(10)),
            GestureDetector(
              onTap: _loadInvestments,
              child: Text(
                'Retry',
                style: TextStyle(
                  color: T.accent,
                  fontSize: R.fs(13),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPortfolioContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header row
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'My Portfolio',
                    style: TextStyle(
                      color: T.textPrimary,
                      fontSize: R.fs(16),
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.4,
                    ),
                  ),
                  SizedBox(height: R.p(2)),
                  Text(
                    '${_investments.length} investment${_investments.length == 1 ? '' : 's'}',
                    style: TextStyle(color: T.textMuted, fontSize: R.fs(11)),
                  ),
                ],
              ),
            ),
            Container(
              padding: EdgeInsets.symmetric(
                horizontal: R.p(12),
                vertical: R.p(8),
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    T.accent.withOpacity(0.15),
                    T.accentSoft.withOpacity(0.1),
                  ],
                ),
                borderRadius: BorderRadius.circular(R.r(12)),
                border: Border.all(color: T.accent.withOpacity(0.3), width: 1),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Total Value',
                    style: TextStyle(
                      color: T.textMuted,
                      fontSize: R.fs(9),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: R.p(2)),
                  Text(
                    _fmtAmount(_portfolioTotal),
                    style: TextStyle(
                      color: T.accent,
                      fontSize: R.fs(15),
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),

        if (_investments.isEmpty) ...[
          SizedBox(height: R.p(20)),
          Center(
            child: Text(
              'No investments yet. Add one below!',
              style: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
            ),
          ),
          SizedBox(height: R.p(16)),
        ] else ...[
          SizedBox(height: R.p(16)),

          // Portfolio allocation mini bar
          _PortfolioAllocationBar(investments: _investments),

          SizedBox(height: R.p(16)),

          // Investment list
          ..._investments.asMap().entries.map((e) {
            final i = e.key;
            final inv = e.value;
            return Padding(
              padding: EdgeInsets.only(
                bottom: i < _investments.length - 1 ? R.p(10) : 0,
              ),
              child: _InvestmentRow(investment: inv),
            );
          }),

          SizedBox(height: R.p(14)),
        ],

        // Add investment button
        GestureDetector(
          onTap: () => _showAddInvestmentSheet(context),
          child: Container(
            height: R.p(44).clamp(40.0, 52.0),
            decoration: BoxDecoration(
              color: T.elevated,
              borderRadius: BorderRadius.circular(R.r(12)),
              border: Border.all(color: T.border, width: 1),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.add_circle_outline_rounded,
                  color: T.accent,
                  size: R.fs(16),
                ),
                SizedBox(width: R.p(6)),
                Text(
                  'Add Investment',
                  style: TextStyle(
                    color: T.accent,
                    fontSize: R.fs(13),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showAddInvestmentSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: T.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(R.r(24))),
      ),
      isScrollControlled: true,
      builder: (ctx) => _AddInvestmentSheet(
        onAdd: (inv) async {
          Navigator.pop(ctx);
          setState(() => _investments.insert(0, inv));
          await _addInvestmentToSupabase(inv);
        },
      ),
    );
  }

  String _fmt(double v) {
    if (v >= 10000000) return '₹${(v / 10000000).toStringAsFixed(2)}Cr';
    if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(2)}L';
    if (v >= 1000) return '₹${(v / 1000).toStringAsFixed(1)}K';
    return '₹${v.toStringAsFixed(0)}';
  }

  String _fmtAmount(double v) {
    if (v >= 10000000) return '₹${(v / 10000000).toStringAsFixed(2)}Cr';
    if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(2)}L';
    if (v >= 1000) return '₹${(v / 1000).toStringAsFixed(1)}K';
    return '₹${v.toStringAsFixed(0)}';
  }
}

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO ALLOCATION BAR
// ═══════════════════════════════════════════════════════════════
class _PortfolioAllocationBar extends StatelessWidget {
  final List<Investment> investments;
  const _PortfolioAllocationBar({required this.investments});

  static Color _colorForType(InvestmentType t) {
    switch (t) {
      case InvestmentType.STOCKS:
        return const Color(0xFF6C63FF);
      case InvestmentType.REAL_ESTATE:
        return const Color(0xFF43C59E);
      case InvestmentType.GOLD:
        return const Color(0xFFF5C842);
      case InvestmentType.PPF:
        return const Color(0xFF4DABF7);
      case InvestmentType.RD:
        return const Color(0xFFFF8C69);
      case InvestmentType.SIP:
        return const Color(0xFFB47EE5);
      case InvestmentType.CRYPTO:
        return const Color(0xFFF7931A);
      case InvestmentType.MUTUAL_FUNDS:
        return const Color(0xFF20C997);
      case InvestmentType.OTHER:
        return const Color(0xFFADB5BD);
    }
  }

  static String _labelForType(InvestmentType t) {
    switch (t) {
      case InvestmentType.STOCKS:
        return 'Stocks';
      case InvestmentType.REAL_ESTATE:
        return 'Real Estate';
      case InvestmentType.GOLD:
        return 'Gold';
      case InvestmentType.PPF:
        return 'PPF';
      case InvestmentType.RD:
        return 'RD';
      case InvestmentType.SIP:
        return 'SIP';
      case InvestmentType.CRYPTO:
        return 'Crypto';
      case InvestmentType.MUTUAL_FUNDS:
        return 'Mutual Funds';
      case InvestmentType.OTHER:
        return 'Other';
    }
  }

  @override
  Widget build(BuildContext context) {
    final Map<InvestmentType, double> grouped = {};
    final total = investments.fold(0.0, (s, i) => s + i.amount);
    for (final inv in investments) {
      grouped[inv.type] = (grouped[inv.type] ?? 0) + inv.amount;
    }
    final sorted = grouped.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Bar
        ClipRRect(
          borderRadius: BorderRadius.circular(R.r(6)),
          child: SizedBox(
            height: R.p(8),
            child: Row(
              children: sorted.map((e) {
                final frac = e.value / total;
                return Expanded(
                  flex: (frac * 1000).round(),
                  child: Container(
                    color: _colorForType(e.key),
                    margin: const EdgeInsets.only(right: 2),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        SizedBox(height: R.p(10)),
        // Legend
        Wrap(
          spacing: R.p(12),
          runSpacing: R.p(6),
          children: sorted.map((e) {
            final pct = (e.value / total * 100).toStringAsFixed(1);
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: R.p(8),
                  height: R.p(8),
                  decoration: BoxDecoration(
                    color: _colorForType(e.key),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                SizedBox(width: R.p(4)),
                Text(
                  '${_labelForType(e.key)} $pct%',
                  style: TextStyle(
                    color: T.textMuted,
                    fontSize: R.fs(10),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// INVESTMENT ROW
// ═══════════════════════════════════════════════════════════════
class _InvestmentRow extends StatelessWidget {
  final Investment investment;
  const _InvestmentRow({required this.investment});

  static IconData _iconForType(InvestmentType t) {
    switch (t) {
      case InvestmentType.STOCKS:
        return Icons.show_chart_rounded;
      case InvestmentType.REAL_ESTATE:
        return Icons.domain_rounded;
      case InvestmentType.GOLD:
        return Icons.workspace_premium_rounded;
      case InvestmentType.PPF:
        return Icons.account_balance_rounded;
      case InvestmentType.RD:
        return Icons.savings_rounded;
      case InvestmentType.SIP:
        return Icons.trending_up_rounded;
      case InvestmentType.CRYPTO:
        return Icons.currency_bitcoin_rounded;
      case InvestmentType.MUTUAL_FUNDS:
        return Icons.pie_chart_rounded;
      case InvestmentType.OTHER:
        return Icons.category_rounded;
    }
  }

  static Color _colorForType(InvestmentType t) {
    switch (t) {
      case InvestmentType.STOCKS:
        return const Color(0xFF6C63FF);
      case InvestmentType.REAL_ESTATE:
        return const Color(0xFF43C59E);
      case InvestmentType.GOLD:
        return const Color(0xFFF5C842);
      case InvestmentType.PPF:
        return const Color(0xFF4DABF7);
      case InvestmentType.RD:
        return const Color(0xFFFF8C69);
      case InvestmentType.SIP:
        return const Color(0xFFB47EE5);
      case InvestmentType.CRYPTO:
        return const Color(0xFFF7931A);
      case InvestmentType.MUTUAL_FUNDS:
        return const Color(0xFF20C997);
      case InvestmentType.OTHER:
        return const Color(0xFFADB5BD);
    }
  }

  static String _labelForType(InvestmentType t) {
    switch (t) {
      case InvestmentType.STOCKS:
        return 'Stocks';
      case InvestmentType.REAL_ESTATE:
        return 'Real Estate';
      case InvestmentType.GOLD:
        return 'Gold';
      case InvestmentType.PPF:
        return 'PPF';
      case InvestmentType.RD:
        return 'Recurring Deposit';
      case InvestmentType.SIP:
        return 'SIP';
      case InvestmentType.CRYPTO:
        return 'Crypto';
      case InvestmentType.MUTUAL_FUNDS:
        return 'Mutual Funds';
      case InvestmentType.OTHER:
        return 'Other';
    }
  }

  String _fmtDate(DateTime d) {
    const months = [
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
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }

  String _fmtAmount(double v) {
    if (v >= 10000000) return '₹${(v / 10000000).toStringAsFixed(2)}Cr';
    if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(2)}L';
    if (v >= 1000) return '₹${(v / 1000).toStringAsFixed(1)}K';
    return '₹${v.toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context) {
    final color = _colorForType(investment.type);

    return Container(
      padding: EdgeInsets.all(R.p(12)),
      decoration: BoxDecoration(
        color: T.elevated,
        borderRadius: BorderRadius.circular(R.r(14)),
        border: Border.all(color: T.border, width: 1),
      ),
      child: Row(
        children: [
          // Icon
          Container(
            width: R.p(40).clamp(36.0, 48.0),
            height: R.p(40).clamp(36.0, 48.0),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(R.r(12)),
            ),
            child: Icon(
              _iconForType(investment.type),
              color: color,
              size: R.fs(18),
            ),
          ),
          SizedBox(width: R.p(12)),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  investment.name,
                  style: TextStyle(
                    color: T.textPrimary,
                    fontSize: R.fs(14),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: R.p(2)),
                Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: R.p(6),
                        vertical: R.p(2),
                      ),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(R.r(4)),
                      ),
                      child: Text(
                        _labelForType(investment.type),
                        style: TextStyle(
                          color: color,
                          fontSize: R.fs(9),
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                    SizedBox(width: R.p(6)),
                    Text(
                      _fmtDate(investment.date),
                      style: TextStyle(color: T.textMuted, fontSize: R.fs(10)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Amount
          Text(
            _fmtAmount(investment.amount),
            style: TextStyle(
              color: T.textPrimary,
              fontSize: R.fs(14),
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// ADD INVESTMENT BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════
class _AddInvestmentSheet extends StatefulWidget {
  final ValueChanged<Investment> onAdd;
  const _AddInvestmentSheet({required this.onAdd});

  @override
  State<_AddInvestmentSheet> createState() => _AddInvestmentSheetState();
}

class _AddInvestmentSheetState extends State<_AddInvestmentSheet> {
  final _nameCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  InvestmentType _type = InvestmentType.STOCKS;

  static const _typeLabels = {
    InvestmentType.STOCKS: 'Stocks',
    InvestmentType.MUTUAL_FUNDS: 'Mutual Funds',
    InvestmentType.CRYPTO: 'Crypto',
    InvestmentType.REAL_ESTATE: 'Real Estate',
    InvestmentType.GOLD: 'Gold',
    InvestmentType.PPF: 'PPF',
    InvestmentType.RD: 'Recurring Deposit',
    InvestmentType.SIP: 'SIP',
    InvestmentType.OTHER: 'Other',
  };

  @override
  void dispose() {
    _nameCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    final name = _nameCtrl.text.trim();
    final amount = double.tryParse(_amountCtrl.text) ?? 0;
    if (name.isEmpty || amount <= 0) return;

    widget.onAdd(
      Investment(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: name,
        type: _type,
        amount: amount,
        date: DateTime.now(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: EdgeInsets.all(R.p(24)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: R.p(40),
                height: R.p(4),
                decoration: BoxDecoration(
                  color: T.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            SizedBox(height: R.p(20)),
            Text(
              'Add Investment',
              style: TextStyle(
                color: T.textPrimary,
                fontSize: R.fs(18),
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
            SizedBox(height: R.p(20)),
            _CalcField(
              label: 'Name',
              hint: 'e.g. HDFC Nifty50',
              controller: _nameCtrl,
              keyboardType: TextInputType.text,
            ),
            SizedBox(height: R.p(14)),
            _CalcField(
              label: 'Amount (₹)',
              hint: 'e.g. 50000',
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
            ),
            SizedBox(height: R.p(14)),
            // Type selector chips
            Text(
              'Type',
              style: TextStyle(
                color: T.textSecondary,
                fontSize: R.fs(13),
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: R.p(8)),
            Wrap(
              spacing: R.p(8),
              runSpacing: R.p(8),
              children: _typeLabels.entries.map((e) {
                final selected = e.key == _type;
                return GestureDetector(
                  onTap: () => setState(() => _type = e.key),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: EdgeInsets.symmetric(
                      horizontal: R.p(12),
                      vertical: R.p(7),
                    ),
                    decoration: BoxDecoration(
                      color: selected ? T.accent.withOpacity(0.15) : T.elevated,
                      borderRadius: BorderRadius.circular(R.r(20)),
                      border: Border.all(
                        color: selected ? T.accent.withOpacity(0.5) : T.border,
                        width: selected ? 1.5 : 1,
                      ),
                    ),
                    child: Text(
                      e.value,
                      style: TextStyle(
                        color: selected ? T.accent : T.textSecondary,
                        fontSize: R.fs(12),
                        fontWeight: selected
                            ? FontWeight.w700
                            : FontWeight.w500,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            SizedBox(height: R.p(24)),
            Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(R.r(14)),
              child: InkWell(
                borderRadius: BorderRadius.circular(R.r(14)),
                onTap: _submit,
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
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      'Add to Portfolio',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: R.fs(15),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            SizedBox(height: R.p(8)),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// DROPDOWN
// ═══════════════════════════════════════════════════════════════
class _InvestmentDropdown extends StatelessWidget {
  final String value;
  final List<String> items;
  final bool isOpen;
  final VoidCallback onToggle;
  final ValueChanged<String> onSelect;

  const _InvestmentDropdown({
    required this.value,
    required this.items,
    required this.isOpen,
    required this.onToggle,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GestureDetector(
          onTap: onToggle,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: EdgeInsets.symmetric(
              horizontal: R.p(16),
              vertical: R.p(14),
            ),
            decoration: BoxDecoration(
              color: T.elevated,
              borderRadius: BorderRadius.circular(isOpen ? R.r(14) : R.r(14))
                  .copyWith(
                    bottomLeft: isOpen ? Radius.zero : Radius.circular(R.r(14)),
                    bottomRight: isOpen
                        ? Radius.zero
                        : Radius.circular(R.r(14)),
                  ),
              border: Border.all(
                color: isOpen ? T.accent.withOpacity(0.6) : T.border,
                width: isOpen ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: T.textPrimary,
                    fontSize: R.fs(14),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
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
                    children: items.map((item) {
                      final isSel = item == value;
                      return GestureDetector(
                        onTap: () => onSelect(item),
                        child: Container(
                          width: double.infinity,
                          padding: EdgeInsets.symmetric(
                            horizontal: R.p(16),
                            vertical: R.p(13),
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
                          child: Text(
                            item,
                            style: TextStyle(
                              color: isSel ? T.accent : T.textSecondary,
                              fontSize: R.fs(13),
                              fontWeight: isSel
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                            ),
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

// ═══════════════════════════════════════════════════════════════
// CALC FIELD
// ═══════════════════════════════════════════════════════════════
class _CalcField extends StatefulWidget {
  final String label, hint;
  final TextEditingController controller;
  final TextInputType keyboardType;

  const _CalcField({
    required this.label,
    required this.hint,
    required this.controller,
    required this.keyboardType,
  });

  @override
  State<_CalcField> createState() => _CalcFieldState();
}

class _CalcFieldState extends State<_CalcField> {
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
    return Row(
      children: [
        SizedBox(
          width: R.w(28).clamp(90.0, 130.0),
          child: Text(
            widget.label,
            style: TextStyle(
              color: T.textSecondary,
              fontSize: R.fs(13),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            decoration: BoxDecoration(
              color: T.surface,
              borderRadius: BorderRadius.circular(R.r(10)),
              border: Border.all(
                color: _focused ? T.accent.withOpacity(0.7) : T.border,
                width: _focused ? 1.5 : 1,
              ),
              boxShadow: _focused
                  ? [
                      BoxShadow(
                        color: T.accent.withOpacity(0.12),
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
              style: TextStyle(
                color: T.textPrimary,
                fontSize: R.fs(14),
                fontWeight: FontWeight.w600,
              ),
              decoration: InputDecoration(
                hintText: widget.hint,
                hintStyle: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(
                  horizontal: R.p(12),
                  vertical: R.p(12),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// RESULT PILL
// ═══════════════════════════════════════════════════════════════
class _ResultPill extends StatelessWidget {
  final String label, value;
  final Color color;
  const _ResultPill(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 320),
        padding: EdgeInsets.symmetric(horizontal: R.p(10), vertical: R.p(12)),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(R.r(14)),
          border: Border.all(color: color.withOpacity(0.3), width: 1),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                color: T.textSecondary,
                fontSize: R.fs(10),
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: R.p(4)),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                value,
                style: TextStyle(
                  color: color,
                  fontSize: R.fs(14),
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// INVESTED VS RETURN DONUT
// ═══════════════════════════════════════════════════════════════
class _InvestedVsReturnDonut extends StatelessWidget {
  final double invested, gain;
  const _InvestedVsReturnDonut({required this.invested, required this.gain});

  @override
  Widget build(BuildContext context) {
    final total = invested + gain;
    final iPct = (invested / total * 100).toStringAsFixed(1);
    final gPct = (gain / total * 100).toStringAsFixed(1);
    final pieSize = R.w(30).clamp(100.0, 140.0);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          width: pieSize,
          height: pieSize,
          child: CustomPaint(
            painter: _SimpleDonut([
              _DonutSeg(invested / total, T.accent),
              _DonutSeg(gain / total, T.green),
            ]),
          ),
        ),
        SizedBox(width: R.p(24)),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _DonutLegend(T.accent, 'Invested', '$iPct%'),
            SizedBox(height: R.p(12)),
            _DonutLegend(T.green, 'Returns', '$gPct%'),
          ],
        ),
      ],
    );
  }
}

class _DonutLegend extends StatelessWidget {
  final Color color;
  final String label, value;
  const _DonutLegend(this.color, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: R.p(10),
          height: R.p(10),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        SizedBox(width: R.p(8)),
        Text(
          label,
          style: TextStyle(
            color: T.textSecondary,
            fontSize: R.fs(12),
            fontWeight: FontWeight.w500,
          ),
        ),
        SizedBox(width: R.p(8)),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: R.fs(12),
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// AI TIP
// ═══════════════════════════════════════════════════════════════
class _AiTip extends StatelessWidget {
  final String type;
  final double maturity, gain, invested;
  const _AiTip(this.type, this.maturity, this.gain, this.invested);

  @override
  Widget build(BuildContext context) {
    final roi = (gain / invested * 100).toStringAsFixed(1);
    String tip;
    if (type == 'SIP / Mutual Fund') {
      tip =
          'Your SIP shows a projected $roi% total return. Increasing your monthly SIP by 10% annually (step-up SIP) can significantly boost your corpus through compounding.';
    } else if (type == 'Fixed Deposit') {
      tip =
          'Your FD yields $roi% total. Consider laddering FDs across 1–3 year tenures for liquidity while maintaining competitive rates.';
    } else if (type == 'PPF') {
      tip =
          'PPF is tax-free at maturity. Your projected gain of $roi% is entirely exempt under Section 80C — maximise ₹1.5L/year for best results.';
    } else {
      tip =
          'Your investment projects a $roi% total return. Diversifying across asset classes can reduce risk while maintaining similar growth potential.';
    }

    return Container(
      padding: EdgeInsets.all(R.p(14)),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [T.accent.withOpacity(0.08), T.accentSoft.withOpacity(0.06)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(R.r(14)),
        border: Border.all(color: T.accent.withOpacity(0.25), width: 1),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(R.p(6)),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [T.accent, T.accentSoft]),
              borderRadius: BorderRadius.circular(R.r(8)),
            ),
            child: Icon(
              Icons.auto_awesome_rounded,
              color: Colors.white,
              size: R.fs(13),
            ),
          ),
          SizedBox(width: R.p(10)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI Insight',
                  style: TextStyle(
                    color: T.accent,
                    fontSize: R.fs(12),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: R.p(4)),
                Text(
                  tip,
                  style: TextStyle(
                    color: T.textSecondary,
                    fontSize: R.fs(12),
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// CHART PAINTERS
// ═══════════════════════════════════════════════════════════════
class _ChartPoint {
  final int year;
  final double value;
  const _ChartPoint(this.year, this.value);
}

class _LineChartPainter extends CustomPainter {
  final List<_ChartPoint> points;
  final Color lineColor, fillColor, gridColor, labelColor;

  const _LineChartPainter({
    required this.points,
    required this.lineColor,
    required this.fillColor,
    required this.gridColor,
    required this.labelColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    final maxVal = points.map((p) => p.value).reduce(math.max);
    const minVal = 0.0;
    final range = maxVal - minVal;
    const padTop = 16.0;
    const padBottom = 24.0;
    const padLeft = 8.0;
    const padRight = 8.0;

    final chartW = size.width - padLeft - padRight;
    final chartH = size.height - padTop - padBottom;

    final gridPaint = Paint()
      ..color = gridColor
      ..strokeWidth = 1;
    for (int i = 0; i <= 4; i++) {
      final y = padTop + chartH - (chartH * i / 4);
      canvas.drawLine(
        Offset(padLeft, y),
        Offset(size.width - padRight, y),
        gridPaint,
      );
    }

    Offset toOffset(int idx) {
      final x = padLeft + (idx / (points.length - 1)) * chartW;
      final y =
          padTop + chartH - ((points[idx].value - minVal) / range) * chartH;
      return Offset(x, y);
    }

    final fillPath = Path();
    fillPath.moveTo(padLeft, padTop + chartH);
    for (int i = 0; i < points.length; i++) {
      final o = toOffset(i);
      if (i == 0) {
        fillPath.lineTo(o.dx, o.dy);
      } else {
        final prev = toOffset(i - 1);
        final cpx = (prev.dx + o.dx) / 2;
        fillPath.cubicTo(cpx, prev.dy, cpx, o.dy, o.dx, o.dy);
      }
    }
    fillPath.lineTo(size.width - padRight, padTop + chartH);
    fillPath.close();
    canvas.drawPath(fillPath, Paint()..color = fillColor);

    final linePaint = Paint()
      ..color = lineColor
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final linePath = Path();
    for (int i = 0; i < points.length; i++) {
      final o = toOffset(i);
      if (i == 0) {
        linePath.moveTo(o.dx, o.dy);
      } else {
        final prev = toOffset(i - 1);
        final cpx = (prev.dx + o.dx) / 2;
        linePath.cubicTo(cpx, prev.dy, cpx, o.dy, o.dx, o.dy);
      }
    }
    canvas.drawPath(linePath, linePaint);

    final step = (points.length / 5).ceil().clamp(1, points.length);
    final dotPaint = Paint()..color = lineColor;
    final tp = TextPainter(textDirection: TextDirection.ltr);

    for (int i = 0; i < points.length; i++) {
      if (i % step != 0 && i != points.length - 1) continue;
      final o = toOffset(i);
      canvas.drawCircle(o, 4, dotPaint);
      canvas.drawCircle(o, 2.5, Paint()..color = Colors.white);
      tp.text = TextSpan(
        text: 'Y${points[i].year}',
        style: TextStyle(color: labelColor, fontSize: 9),
      );
      tp.layout();
      tp.paint(
        canvas,
        Offset(o.dx - tp.width / 2, size.height - padBottom + 4),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _LineChartPainter old) => old.points != points;
}

class _DonutSeg {
  final double frac;
  final Color color;
  const _DonutSeg(this.frac, this.color);
}

class _SimpleDonut extends CustomPainter {
  final List<_DonutSeg> segs;
  const _SimpleDonut(this.segs);

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = math.min(cx, cy);
    final inner = r * 0.58;
    double angle = -math.pi / 2;
    const gap = 0.04;

    for (final s in segs) {
      final sweep = s.frac * 2 * math.pi - gap;
      final paint = Paint()
        ..color = s.color
        ..style = PaintingStyle.fill;
      final path = Path();
      path.moveTo(cx + inner * math.cos(angle), cy + inner * math.sin(angle));
      path.arcTo(
        Rect.fromCircle(center: Offset(cx, cy), radius: r),
        angle,
        sweep,
        false,
      );
      path.arcTo(
        Rect.fromCircle(center: Offset(cx, cy), radius: inner),
        angle + sweep,
        -sweep,
        false,
      );
      path.close();
      canvas.drawPath(path, paint);
      angle += sweep + gap;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter _) => true;
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
