import 'dart:math' as math;

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:mobile/theme/theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// ═══════════════════════════════════════════════════════════════
// DATA MODEL — Loan entry (from Supabase "loans" table)
// ═══════════════════════════════════════════════════════════════
enum LoanType { AUTO, HOME, PERSONAL, CREDIT_CARD, EDUCATION, OTHER }

enum LoanStatus { ACTIVE, CLOSED, DEFAULTED }

class Loan {
  final String id;
  final String name;
  final String lender;
  final LoanType type;
  final double principalAmount;
  final double outstandingBalance;
  final double interestRate;
  final int tenureInMonths;
  final double emiAmount;
  final DateTime issueDate;
  final DateTime? nextPaymentDate;
  final LoanStatus status;

  const Loan({
    required this.id,
    required this.name,
    required this.lender,
    required this.type,
    required this.principalAmount,
    required this.outstandingBalance,
    required this.interestRate,
    required this.tenureInMonths,
    required this.emiAmount,
    required this.issueDate,
    this.nextPaymentDate,
    required this.status,
  });

  static LoanType parseType(String raw) {
    switch (raw.toUpperCase()) {
      case 'AUTO':
        return LoanType.AUTO;
      case 'HOME':
        return LoanType.HOME;
      case 'PERSONAL':
        return LoanType.PERSONAL;
      case 'CREDIT_CARD':
        return LoanType.CREDIT_CARD;
      case 'EDUCATION':
        return LoanType.EDUCATION;
      default:
        return LoanType.OTHER;
    }
  }

  static LoanStatus parseStatus(String raw) {
    switch (raw.toUpperCase()) {
      case 'ACTIVE':
        return LoanStatus.ACTIVE;
      case 'CLOSED':
        return LoanStatus.CLOSED;
      case 'DEFAULTED':
        return LoanStatus.DEFAULTED;
      default:
        return LoanStatus.ACTIVE;
    }
  }

  factory Loan.fromMap(Map<String, dynamic> m) {
    return Loan(
      id: m['id'] as String,
      name: m['name'] as String,
      lender: m['lender'] as String? ?? 'Unknown',
      type: Loan.parseType(m['type'] as String? ?? 'OTHER'),
      principalAmount: _parseDecimal(m['principalAmount']),
      outstandingBalance: _parseDecimal(m['outstandingBalance']),
      interestRate: _parseDecimal(m['interestRate']),
      tenureInMonths: (m['tenureInMonths'] as num?)?.toInt() ?? 0,
      emiAmount: _parseDecimal(m['emiAmount']),
      issueDate: m['issueDate'] != null
          ? DateTime.parse(m['issueDate'] as String)
          : DateTime.now(),
      nextPaymentDate: m['nextPaymentDate'] != null
          ? DateTime.parse(m['nextPaymentDate'] as String)
          : null,
      status: Loan.parseStatus(m['status'] as String? ?? 'ACTIVE'),
    );
  }

  static double _parseDecimal(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  double get paidOffProgress {
    if (principalAmount == 0) return 0;
    return ((principalAmount - outstandingBalance) / principalAmount).clamp(
      0.0,
      1.0,
    );
  }

  DateTime get projectedPayoffDate {
    return issueDate.add(Duration(days: tenureInMonths * 30));
  }

  String get payoffYear {
    final payoff = projectedPayoffDate;
    final now = DateTime.now();
    if (status == LoanStatus.CLOSED) return 'Closed';
    if (outstandingBalance == 0) return 'Paid Off';
    if (payoff.isBefore(now)) return 'Overdue';
    return payoff.year.toString();
  }
}

// ═══════════════════════════════════════════════════════════════
// DEBT SCREEN
// ═══════════════════════════════════════════════════════════════
class DebtScreen extends StatefulWidget {
  const DebtScreen({super.key});

  @override
  State<DebtScreen> createState() => _DebtScreenState();
}

class _DebtScreenState extends State<DebtScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ac;
  late Animation<double> _fade;
  late Animation<Offset> _slide;

  // Loans data
  List<Loan> _loans = [];
  bool _loadingLoans = true;
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

    WidgetsBinding.instance.addPostFrameCallback((_) => _loadLoans());
  }

  @override
  void dispose() {
    _ac.dispose();
    super.dispose();
  }

  // ─── Supabase data fetching ───────────────────────────────────

  Future<void> _loadLoans() async {
    setState(() {
      _loadingLoans = true;
      _loadError = null;
    });

    try {
      final clerkUserId = ClerkAuth.of(context).user?.id ?? '';
      if (clerkUserId.isEmpty) {
        setState(() {
          _loadError = 'Not authenticated.';
          _loadingLoans = false;
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
          _loadingLoans = false;
        });
        return;
      }

      final internalId =
          (userRows.first as Map<String, dynamic>)['id'] as String;

      // Try with internal UUID first
      List<Loan> fetched = await _fetchByUserId(internalId);

      // Fallback: try with clerk user ID directly
      if (fetched.isEmpty) {
        fetched = await _fetchByUserId(clerkUserId);
      }

      setState(() {
        _loans = fetched;
        _loadingLoans = false;
      });
    } catch (e) {
      debugPrint('[DebtScreen] error loading loans: $e');
      setState(() {
        _loadError = 'Failed to load loans.';
        _loadingLoans = false;
      });
    }
  }

  Future<List<Loan>> _fetchByUserId(String userId) async {
    try {
      final rows = await _db
          .from('loans')
          .select()
          .eq('userId', userId)
          .order('outstandingBalance', ascending: false)
          .limit(100);
      final list = rows as List;
      if (list.isNotEmpty) {
        return list
            .map((r) => Loan.fromMap(r as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint('[DebtScreen] fetchByUserId($userId) failed: $e');
    }
    return [];
  }

  // ─── Computed stats ───────────────────────────────────────────

  double get _totalDebt =>
      _loans.fold(0.0, (sum, l) => sum + l.outstandingBalance);

  double get _totalPrincipal =>
      _loans.fold(0.0, (sum, l) => sum + l.principalAmount);

  double get _totalPaidOff => _totalPrincipal - _totalDebt;

  Map<LoanType, double> get _debtComposition {
    final Map<LoanType, double> comp = {};
    for (final loan in _loans) {
      comp[loan.type] = (comp[loan.type] ?? 0) + loan.outstandingBalance;
    }
    return comp;
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
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            SliverPadding(
              padding: EdgeInsets.fromLTRB(R.p(20), R.p(10), R.p(20), R.p(24)),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _DebtOverviewTitle(),
                  SizedBox(height: R.p(14)),
                  _loadingLoans
                      ? _buildLoadingState()
                      : _loadError != null
                      ? _buildErrorState()
                      : _buildContent(),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return _SCard(
      child: SizedBox(
        height: R.p(200),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: T.accent, strokeWidth: 2.5),
              SizedBox(height: R.p(12)),
              Text(
                'Loading your debt information...',
                style: TextStyle(color: T.textMuted, fontSize: R.fs(12)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return _SCard(
      child: SizedBox(
        height: R.p(200),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline_rounded,
                color: T.textMuted,
                size: R.fs(32),
              ),
              SizedBox(height: R.p(12)),
              Text(
                _loadError ?? 'Something went wrong.',
                style: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
              ),
              SizedBox(height: R.p(16)),
              GestureDetector(
                onTap: _loadLoans,
                child: Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: R.p(20),
                    vertical: R.p(10),
                  ),
                  decoration: BoxDecoration(
                    color: T.accent.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(R.r(10)),
                  ),
                  child: Text(
                    'Retry',
                    style: TextStyle(
                      color: T.accent,
                      fontSize: R.fs(14),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_loans.isEmpty) {
      return _SCard(
        child: SizedBox(
          height: R.p(200),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.check_circle_outline_rounded,
                  color: T.green,
                  size: R.fs(48),
                ),
                SizedBox(height: R.p(12)),
                Text(
                  'No debts found!',
                  style: TextStyle(
                    color: T.textPrimary,
                    fontSize: R.fs(16),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: R.p(6)),
                Text(
                  'You\'re debt-free. Keep it up!',
                  style: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Column(
      children: [
        _StatGrid(totalDebt: _totalDebt, totalPaidOff: _totalPaidOff),
        SizedBox(height: R.p(16)),
        _DebtCompositionCard(
          totalDebt: _totalDebt,
          composition: _debtComposition,
        ),
        SizedBox(height: R.p(16)),
        _LoansList(loans: _loans),
        SizedBox(height: R.p(16)),
        _AiInsightsCard(loans: _loans, totalDebt: _totalDebt),
        SizedBox(height: R.p(8)),
      ],
    );
  }
}

class _DebtOverviewTitle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          'Debt Overview',
          style: TextStyle(
            color: T.textPrimary,
            fontSize: R.fs(22),
            fontWeight: FontWeight.w800,
            letterSpacing: -0.8,
          ),
        ),
        const Spacer(),
        _Chip('Feb 2026', T.accent),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final Color color;
  const _Chip(this.label, this.color);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: R.p(10), vertical: R.p(4)),
      decoration: BoxDecoration(
        color: color.withOpacity(0.14),
        borderRadius: BorderRadius.circular(R.r(20)),
        border: Border.all(color: color.withOpacity(0.4), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: R.fs(11),
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// 2×2 STAT GRID
// ═══════════════════════════════════════════════════════════════
class _StatGrid extends StatelessWidget {
  final double totalDebt;
  final double totalPaidOff;

  const _StatGrid({required this.totalDebt, required this.totalPaidOff});

  @override
  Widget build(BuildContext context) {
    final stats = [
      _StatData(
        'Total Debt',
        _fmtAmount(totalDebt),
        Icons.account_balance_wallet_rounded,
        T.red,
        totalPaidOff > 0 ? '-${_fmtAmount(totalPaidOff)} paid' : 'Outstanding',
      ),
      _StatData(
        'Monthly Impact',
        '₹${(totalDebt * 0.015).toStringAsFixed(0)}',
        Icons.trending_down_rounded,
        T.gold,
        'Est. monthly EMI',
      ),
      _StatData(
        'Credit Health',
        'Good',
        Icons.verified_rounded,
        T.green,
        'On-time payments',
      ),
      _StatData(
        'Total Paid',
        _fmtAmount(totalPaidOff),
        Icons.pie_chart_rounded,
        T.accent,
        'Progress made',
      ),
    ];

    return SizedBox(
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: R.p(12),
        mainAxisSpacing: R.p(12),
        childAspectRatio: 1.2,
        children: stats.map((s) => _StatCard(s)).toList(),
      ),
    );
  }

  String _fmtAmount(double v) {
    if (v >= 10000000) return '₹${(v / 10000000).toStringAsFixed(2)}Cr';
    if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(2)}L';
    if (v >= 1000) return '₹${(v / 1000).toStringAsFixed(1)}K';
    return '₹${v.toStringAsFixed(0)}';
  }
}

class _StatData {
  final String label, value, sub;
  final IconData icon;
  final Color color;
  const _StatData(this.label, this.value, this.icon, this.color, this.sub);
}

class _StatCard extends StatelessWidget {
  final _StatData data;
  const _StatCard(this.data);

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      padding: EdgeInsets.all(R.p(14)),

      decoration: BoxDecoration(
        color: T.surface,
        borderRadius: BorderRadius.circular(R.r(18)),
        border: Border.all(color: data.color.withOpacity(0.22), width: 1),
        boxShadow: [
          BoxShadow(
            color: T.border.withOpacity(0.4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: R.p(18).clamp(24.0, 34.0),
                height: R.p(18).clamp(24.0, 34.0),
                decoration: BoxDecoration(
                  color: data.color.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(R.r(8)),
                ),
                child: Icon(data.icon, color: data.color, size: R.fs(14)),
              ),
              const Spacer(),
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: data.color,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                data.label,
                style: TextStyle(
                  color: T.textSecondary,
                  fontSize: R.fs(10),
                  fontWeight: FontWeight.w500,
                ),
              ),
              SizedBox(height: R.p(2)),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  data.value,
                  style: TextStyle(
                    color: data.color,
                    fontSize: R.fs(18),
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
              ),
              SizedBox(height: R.p(2)),
              Text(
                data.sub,
                style: TextStyle(color: T.textMuted, fontSize: R.fs(9)),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// DEBT COMPOSITION DONUT
// ═══════════════════════════════════════════════════════════════
class _DebtCompositionCard extends StatelessWidget {
  final double totalDebt;
  final Map<LoanType, double> composition;

  const _DebtCompositionCard({
    required this.totalDebt,
    required this.composition,
  });

  static Color _colorForType(LoanType t) {
    switch (t) {
      case LoanType.HOME:
        return T.accent;
      case LoanType.AUTO:
        return T.accentSoft;
      case LoanType.PERSONAL:
        return T.gold;
      case LoanType.CREDIT_CARD:
        return T.red;
      case LoanType.EDUCATION:
        return const Color(0xFF4DABF7);
      case LoanType.OTHER:
        return T.textSecondary;
    }
  }

  static String _labelForType(LoanType t) {
    switch (t) {
      case LoanType.HOME:
        return 'Home Loan';
      case LoanType.AUTO:
        return 'Auto Loan';
      case LoanType.PERSONAL:
        return 'Personal';
      case LoanType.CREDIT_CARD:
        return 'Credit Card';
      case LoanType.EDUCATION:
        return 'Education';
      case LoanType.OTHER:
        return 'Other';
    }
  }

  @override
  Widget build(BuildContext context) {
    final segs =
        composition.entries
            .map(
              (e) => _Seg(
                _labelForType(e.key),
                e.value / totalDebt,
                _colorForType(e.key),
              ),
            )
            .toList()
          ..sort((a, b) => b.value.compareTo(a.value));

    final pieSize = R.w(36).clamp(120.0, 160.0);

    return _SCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardHeader('Debt Composition', null),
          SizedBox(height: R.p(18)),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              SizedBox(
                width: pieSize,
                height: pieSize,
                child: CustomPaint(
                  painter: _DonutPainter(segs),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _fmtAmount(totalDebt),
                          style: TextStyle(
                            color: T.textPrimary,
                            fontSize: R.fs(13),
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                        ),
                        Text(
                          'Total',
                          style: TextStyle(
                            color: T.textSecondary,
                            fontSize: R.fs(9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              SizedBox(width: R.p(16)),
              Expanded(
                child: Column(
                  children: segs
                      .map(
                        (s) => Padding(
                          padding: EdgeInsets.only(bottom: R.p(9)),
                          child: Row(
                            children: [
                              Container(
                                width: R.p(9),
                                height: R.p(9),
                                decoration: BoxDecoration(
                                  color: s.color,
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              ),
                              SizedBox(width: R.p(8)),
                              Expanded(
                                child: Text(
                                  s.label,
                                  style: TextStyle(
                                    color: T.textSecondary,
                                    fontSize: R.fs(11),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              Text(
                                '${(s.value * 100).toInt()}%',
                                style: TextStyle(
                                  color: s.color,
                                  fontSize: R.fs(11),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _fmtAmount(double v) {
    if (v >= 10000000) return '₹${(v / 10000000).toStringAsFixed(1)}Cr';
    if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(1)}L';
    if (v >= 1000) return '₹${(v / 1000).toStringAsFixed(1)}K';
    return '₹${v.toStringAsFixed(0)}';
  }
}

// ═══════════════════════════════════════════════════════════════
// LOANS LIST
// ═══════════════════════════════════════════════════════════════
class _LoansList extends StatelessWidget {
  final List<Loan> loans;
  const _LoansList({required this.loans});

  @override
  Widget build(BuildContext context) {
    return _SCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardHeader('Your Loans', '${loans.length}'),
          SizedBox(height: R.p(16)),
          ...loans.asMap().entries.map((e) {
            final i = e.key;
            final loan = e.value;
            return Padding(
              padding: EdgeInsets.only(
                bottom: i < loans.length - 1 ? R.p(14) : 0,
              ),
              child: _LoanRow(loan: loan),
            );
          }),
        ],
      ),
    );
  }
}

class _LoanRow extends StatelessWidget {
  final Loan loan;
  const _LoanRow({required this.loan});

  static Color _colorForType(LoanType t) {
    switch (t) {
      case LoanType.HOME:
        return T.accent;
      case LoanType.AUTO:
        return T.accentSoft;
      case LoanType.PERSONAL:
        return T.gold;
      case LoanType.CREDIT_CARD:
        return T.red;
      case LoanType.EDUCATION:
        return const Color(0xFF4DABF7);
      case LoanType.OTHER:
        return T.textSecondary;
    }
  }

  static IconData _iconForType(LoanType t) {
    switch (t) {
      case LoanType.HOME:
        return Icons.home_rounded;
      case LoanType.AUTO:
        return Icons.directions_car_rounded;
      case LoanType.PERSONAL:
        return Icons.person_rounded;
      case LoanType.CREDIT_CARD:
        return Icons.credit_card_rounded;
      case LoanType.EDUCATION:
        return Icons.school_rounded;
      case LoanType.OTHER:
        return Icons.category_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _colorForType(loan.type);
    final payoffYear = loan.payoffYear;

    return Container(
      padding: EdgeInsets.all(R.p(14)),
      decoration: BoxDecoration(
        color: T.elevated,
        borderRadius: BorderRadius.circular(R.r(16)),
        border: Border.all(color: color.withOpacity(0.2), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: R.p(40).clamp(36.0, 48.0),
                height: R.p(40).clamp(36.0, 48.0),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(R.r(12)),
                ),
                child: Icon(
                  _iconForType(loan.type),
                  color: color,
                  size: R.fs(18),
                ),
              ),
              SizedBox(width: R.p(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      loan.name,
                      style: TextStyle(
                        color: T.textPrimary,
                        fontSize: R.fs(14),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: R.p(2)),
                    Text(
                      loan.lender,
                      style: TextStyle(color: T.textMuted, fontSize: R.fs(11)),
                    ),
                  ],
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: R.p(8),
                  vertical: R.p(3),
                ),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(R.r(6)),
                ),
                child: Text(
                  payoffYear,
                  style: TextStyle(
                    color: color,
                    fontSize: R.fs(11),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: R.p(12)),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Outstanding',
                      style: TextStyle(color: T.textMuted, fontSize: R.fs(9)),
                    ),
                    SizedBox(height: R.p(2)),
                    Text(
                      _fmtAmount(loan.outstandingBalance),
                      style: TextStyle(
                        color: T.textPrimary,
                        fontSize: R.fs(13),
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'EMI Amount',
                      style: TextStyle(color: T.textMuted, fontSize: R.fs(9)),
                    ),
                    SizedBox(height: R.p(2)),
                    Text(
                      _fmtAmount(loan.emiAmount),
                      style: TextStyle(
                        color: T.textSecondary,
                        fontSize: R.fs(13),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: R.p(10)),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(R.r(6)),
            child: Stack(
              children: [
                Container(height: 6, color: T.border.withOpacity(0.6)),
                FractionallySizedBox(
                  widthFactor: loan.paidOffProgress,
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [color, color.withOpacity(0.6)],
                      ),
                      borderRadius: BorderRadius.circular(R.r(6)),
                      boxShadow: [
                        BoxShadow(color: color.withOpacity(0.4), blurRadius: 6),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: R.p(4)),
          Text(
            '${(loan.paidOffProgress * 100).toInt()}% paid off • ${loan.tenureInMonths} months',
            style: TextStyle(color: T.textMuted, fontSize: R.fs(10)),
          ),
        ],
      ),
    );
  }

  String _fmtAmount(double v) {
    if (v >= 10000000) return '₹${(v / 10000000).toStringAsFixed(2)}Cr';
    if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(2)}L';
    if (v >= 1000) return '₹${(v / 1000).toStringAsFixed(1)}K';
    return '₹${v.toStringAsFixed(0)}';
  }
}

// ═══════════════════════════════════════════════════════════════
// AI INSIGHTS CARD
// ═══════════════════════════════════════════════════════════════
class _AiInsightsCard extends StatelessWidget {
  final List<Loan> loans;
  final double totalDebt;

  const _AiInsightsCard({required this.loans, required this.totalDebt});

  @override
  Widget build(BuildContext context) {
    final insights = _generateInsights();

    return _SCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: EdgeInsets.all(R.p(6)),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [T.accent, T.accentSoft],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(R.r(10)),
                ),
                child: Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                  size: R.fs(14),
                ),
              ),
              SizedBox(width: R.p(10)),
              Text(
                'AI Insights',
                style: TextStyle(
                  color: T.textPrimary,
                  fontSize: R.fs(16),
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
              ),
              const Spacer(),
              Text(
                'Personalised',
                style: TextStyle(
                  color: T.accent,
                  fontSize: R.fs(11),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          SizedBox(height: R.p(16)),
          ...insights.map(
            (ins) => Padding(
              padding: EdgeInsets.only(bottom: R.p(12)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: R.p(36).clamp(32.0, 42.0),
                    height: R.p(36).clamp(32.0, 42.0),
                    decoration: BoxDecoration(
                      color: ins.color.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(R.r(12)),
                    ),
                    child: Icon(ins.icon, color: ins.color, size: R.fs(16)),
                  ),
                  SizedBox(width: R.p(12)),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ins.title,
                          style: TextStyle(
                            color: T.textPrimary,
                            fontSize: R.fs(13),
                            fontWeight: FontWeight.w600,
                            letterSpacing: -0.2,
                          ),
                        ),
                        SizedBox(height: R.p(3)),
                        Text(
                          ins.body,
                          style: TextStyle(
                            color: T.textSecondary,
                            fontSize: R.fs(12),
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<_Insight> _generateInsights() {
    final insights = <_Insight>[];

    // Find highest interest loan
    if (loans.isNotEmpty) {
      final highestInterest = loans.reduce(
        (a, b) => a.interestRate > b.interestRate ? a : b,
      );

      if (highestInterest.interestRate > 10) {
        insights.add(
          _Insight(
            Icons.lightbulb_rounded,
            'Avalanche Strategy',
            'Focus on ${highestInterest.name} (${highestInterest.interestRate.toStringAsFixed(1)}% interest) to save maximum on interest payments.',
            T.gold,
          ),
        );
      }
    }

    // Credit card specific insight
    final ccLoans = loans.where((l) => l.type == LoanType.CREDIT_CARD).toList();
    if (ccLoans.isNotEmpty) {
      insights.add(
        _Insight(
          Icons.trending_up_rounded,
          'Credit Score Boost',
          'Reducing credit card utilization below 30% could improve your credit score significantly.',
          T.green,
        ),
      );
    }

    // General repayment insight
    if (loans.length > 1) {
      insights.add(
        _Insight(
          Icons.calendar_month_rounded,
          'Consolidation Option',
          'Consider debt consolidation to potentially lower your average interest rate and simplify payments.',
          T.accent,
        ),
      );
    }

    // Default insight if none generated
    if (insights.isEmpty) {
      insights.add(
        _Insight(
          Icons.tips_and_updates_rounded,
          'Stay on Track',
          'You\'re managing your debt well. Keep making timely payments to maintain good credit health.',
          T.accent,
        ),
      );
    }

    return insights.take(3).toList();
  }
}

class _Insight {
  final IconData icon;
  final String title, body;
  final Color color;
  const _Insight(this.icon, this.title, this.body, this.color);
}

// ═══════════════════════════════════════════════════════════════
// SHARED WIDGETS
// ═══════════════════════════════════════════════════════════════
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

class _CardHeader extends StatelessWidget {
  final String title;
  final String? pillLabel;
  const _CardHeader(this.title, this.pillLabel);
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(
            color: T.textPrimary,
            fontSize: R.fs(16),
            fontWeight: FontWeight.w700,
            letterSpacing: -0.4,
          ),
        ),
        const Spacer(),
        if (pillLabel != null)
          AnimatedContainer(
            duration: const Duration(milliseconds: 320),
            padding: EdgeInsets.symmetric(
              horizontal: R.p(12),
              vertical: R.p(5),
            ),
            decoration: BoxDecoration(
              color: T.elevated,
              borderRadius: BorderRadius.circular(R.r(8)),
              border: Border.all(color: T.border, width: 1),
            ),
            child: Text(
              pillLabel!,
              style: TextStyle(
                color: T.textSecondary,
                fontSize: R.fs(12),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// DONUT PAINTER
// ═══════════════════════════════════════════════════════════════
class _Seg {
  final String label;
  final double value;
  final Color color;
  const _Seg(this.label, this.value, this.color);
}

class _DonutPainter extends CustomPainter {
  final List<_Seg> segs;
  const _DonutPainter(this.segs);

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final outerR = math.min(cx, cy);
    final innerR = outerR * 0.56;
    double angle = -math.pi / 2;
    const gap = 0.03;
    for (final s in segs) {
      final sweep = s.value * 2 * math.pi - gap;
      final mid = angle + sweep / 2;
      final paint = Paint()
        ..color = s.color
        ..style = PaintingStyle.fill;
      canvas.save();
      canvas.translate(math.cos(mid) * 2, math.sin(mid) * 2);
      final path = Path();
      path.moveTo(cx + innerR * math.cos(angle), cy + innerR * math.sin(angle));
      path.arcTo(
        Rect.fromCircle(center: Offset(cx, cy), radius: outerR),
        angle,
        sweep,
        false,
      );
      path.arcTo(
        Rect.fromCircle(center: Offset(cx, cy), radius: innerR),
        angle + sweep,
        -sweep,
        false,
      );
      path.close();
      canvas.drawPath(path, paint);
      canvas.restore();
      angle += sweep + gap;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter _) => true;
}
