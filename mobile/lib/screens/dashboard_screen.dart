import 'dart:math' as math;

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:mobile/provider/dashboard_provider.dart';

import 'package:mobile/theme/theme.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ac;
  late Animation<double> _fade;
  late Animation<Offset> _slide;

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

    // Load dashboard data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userId = ClerkAuth.of(context).user?.id ?? '';
      debugPrint('[Auth] userId: "$userId"');
      DashboardNotifier().clear();

      DashboardNotifier().load(clerkUserId: userId);
    });
  }

  @override
  void dispose() {
    _ac.dispose();
    super.dispose();
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
        child: ListenableBuilder(
          listenable: DashboardNotifier(),
          builder: (context, _) {
            final dn = DashboardNotifier();
            return CustomScrollView(
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
                      _AccountCard(dn: dn),
                      SizedBox(height: R.p(16)),
                      _QuickStats(dn: dn),
                      SizedBox(height: R.p(16)),
                      _CashflowCard(dn: dn),
                      SizedBox(height: R.p(16)),
                      _ExpenseRow(dn: dn),
                      SizedBox(height: R.p(16)),
                      _RecentTransactions(dn: dn),
                      SizedBox(height: R.p(8)),
                    ]),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNT CARD
// ═══════════════════════════════════════════════════════════════
class _AccountCard extends StatelessWidget {
  final DashboardNotifier dn;
  const _AccountCard({required this.dn});

  @override
  Widget build(BuildContext context) {
    final account = dn.account;
    final isLoading = dn.loading && account == null;
    final pct = dn.monthOverMonthPct;
    final isPositive = pct >= 0;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(R.r(24)),
        gradient: LinearGradient(
          colors: [T.cardGrad1, T.cardGrad2],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: T.accent.withOpacity(0.28), width: 1),
        boxShadow: [
          BoxShadow(
            color: T.accent.withOpacity(0.12),
            blurRadius: 28,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Decorative blobs
          Positioned(
            top: -24,
            right: -24,
            child: Container(
              width: R.w(28),
              height: R.w(28),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [T.accent.withOpacity(0.18), Colors.transparent],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -16,
            left: 50,
            child: Container(
              width: R.w(18),
              height: R.w(18),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [T.accentSoft.withOpacity(0.14), Colors.transparent],
                ),
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.all(R.p(22)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _Chip(account?.type ?? 'ACCOUNT', T.accent),
                    const Spacer(),
                    Icon(
                      Icons.more_horiz_rounded,
                      color: T.textSecondary,
                      size: R.fs(20),
                    ),
                  ],
                ),
                SizedBox(height: R.p(14)),
                // Account name
                isLoading
                    ? _Shimmer(width: R.p(140), height: R.fs(12))
                    : Text(
                        account?.name ?? '—',
                        style: TextStyle(
                          color: T.textSecondary,
                          fontSize: R.fs(12),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                SizedBox(height: R.p(4)),
                // Balance
                isLoading
                    ? _Shimmer(width: R.p(200), height: R.fs(34))
                    : FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          dn.formattedBalance,
                          style: TextStyle(
                            color: T.textPrimary,
                            fontSize: R.fs(34),
                            fontWeight: FontWeight.w800,
                            letterSpacing: -1.5,
                          ),
                        ),
                      ),
                SizedBox(height: R.p(6)),
                // Month-over-month badge
                isLoading
                    ? _Shimmer(width: R.p(80), height: R.fs(11) + 8)
                    : Row(
                        children: [
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: R.p(6),
                              vertical: R.p(3),
                            ),
                            decoration: BoxDecoration(
                              color: (isPositive ? T.red : T.green).withOpacity(
                                0.14,
                              ),
                              borderRadius: BorderRadius.circular(R.r(6)),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isPositive
                                      ? Icons.arrow_upward_rounded
                                      : Icons.arrow_downward_rounded,
                                  color: isPositive ? T.red : T.green,
                                  size: R.fs(11),
                                ),
                                SizedBox(width: R.p(2)),
                                Text(
                                  '${isPositive ? '+' : ''}${pct.toStringAsFixed(1)}%',
                                  style: TextStyle(
                                    color: isPositive ? T.red : T.green,
                                    fontSize: R.fs(11),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          SizedBox(width: R.p(8)),
                          Text(
                            'expenses vs last month',
                            style: TextStyle(
                              color: T.textMuted,
                              fontSize: R.fs(11),
                            ),
                          ),
                        ],
                      ),
                SizedBox(height: R.p(18)),
                Divider(color: T.border.withOpacity(0.7), height: 1),
                SizedBox(height: R.p(14)),
                // Income / Expense / Saved
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _MiniStat(
                      'Income',
                      _fmt(dn.totalIncome),
                      T.green,
                      Icons.arrow_downward_rounded,
                      isLoading,
                    ),
                    Container(width: 1, height: 32, color: T.border),
                    _MiniStat(
                      'Expenses',
                      _fmt(dn.totalExpense),
                      T.red,
                      Icons.arrow_upward_rounded,
                      isLoading,
                    ),
                    Container(width: 1, height: 32, color: T.border),
                    _MiniStat(
                      'Saved',
                      _fmt(dn.totalSaved),
                      T.gold,
                      Icons.savings_outlined,
                      isLoading,
                    ),
                  ],
                ),
                SizedBox(height: R.p(16)),
                Material(
                  color: T.accent.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(R.r(12)),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(R.r(12)),
                    onTap: () {},
                    child: Container(
                      height: R.p(44).clamp(40.0, 52.0),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(R.r(12)),
                        border: Border.all(
                          color: T.accent.withOpacity(0.35),
                          width: 1,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          'View Detailed Statement →',
                          style: TextStyle(
                            color: T.accent,
                            fontSize: R.fs(13),
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _fmt(double v) {
    if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(1)}L';
    if (v >= 1000) {
      final s = v.toStringAsFixed(0);
      final buf = StringBuffer();
      int rem = s.length % 3;
      if (rem != 0) buf.write(s.substring(0, rem));
      for (int i = rem; i < s.length; i += 3) {
        if (buf.isNotEmpty) buf.write(',');
        buf.write(s.substring(i, i + 3));
      }
      return '₹$buf';
    }
    return '₹${v.toStringAsFixed(0)}';
  }
}

// ═══════════════════════════════════════════════════════════════
// QUICK STATS
// ═══════════════════════════════════════════════════════════════
class _QuickStats extends StatelessWidget {
  final DashboardNotifier dn;
  const _QuickStats({required this.dn});

  @override
  Widget build(BuildContext context) {
    // These can be extended later to pull from loans/budgets tables
    final stats = [
      {
        'label': 'Expenses',
        'value': dn.loading ? '—' : _fmt(dn.totalExpense),
        'sub': 'This month',
        'c': T.red,
      },
      {
        'label': 'Income',
        'value': dn.loading ? '—' : _fmt(dn.totalIncome),
        'sub': 'This month',
        'c': T.green,
      },
      {
        'label': 'Saved',
        'value': dn.loading ? '—' : _fmt(dn.totalSaved),
        'sub': 'This month',
        'c': T.accent,
      },
    ];

    return Row(
      children: List.generate(stats.length, (i) {
        final s = stats[i];
        final c = s['c'] as Color;
        return Expanded(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 320),
            margin: EdgeInsets.only(right: i < stats.length - 1 ? R.p(10) : 0),
            padding: EdgeInsets.symmetric(
              horizontal: R.p(12),
              vertical: R.p(14),
            ),
            decoration: BoxDecoration(
              color: T.surface,
              borderRadius: BorderRadius.circular(R.r(16)),
              border: Border.all(color: c.withOpacity(0.22), width: 1),
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
              children: [
                Text(
                  s['label'] as String,
                  style: TextStyle(
                    color: T.textSecondary,
                    fontSize: R.fs(10),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: R.p(5)),
                dn.loading
                    ? _Shimmer(width: double.infinity, height: R.fs(16))
                    : FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          s['value'] as String,
                          style: TextStyle(
                            color: c,
                            fontSize: R.fs(16),
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ),
                SizedBox(height: R.p(3)),
                Text(
                  s['sub'] as String,
                  style: TextStyle(color: T.textMuted, fontSize: R.fs(10)),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  static String _fmt(double v) {
    if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(1)}L';
    if (v >= 1000) {
      final s = v.toStringAsFixed(0);
      final buf = StringBuffer();
      int rem = s.length % 3;
      if (rem != 0) buf.write(s.substring(0, rem));
      for (int i = rem; i < s.length; i += 3) {
        if (buf.isNotEmpty) buf.write(',');
        buf.write(s.substring(i, i + 3));
      }
      return '₹$buf';
    }
    return '₹${v.toStringAsFixed(0)}';
  }
}

// ═══════════════════════════════════════════════════════════════
// CASHFLOW CHART
// ═══════════════════════════════════════════════════════════════
class _CashflowCard extends StatelessWidget {
  final DashboardNotifier dn;
  const _CashflowCard({required this.dn});

  @override
  Widget build(BuildContext context) {
    final chartH = R.h(16).clamp(110.0, 160.0);
    final flows = dn.monthlyFlow;
    final isLoading = dn.loading && flows.isEmpty;

    return _SCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Cashflow',
                style: TextStyle(
                  color: T.textPrimary,
                  fontSize: R.fs(16),
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
              ),
              const Spacer(),
              _PillBtn('6M'),
            ],
          ),
          SizedBox(height: R.p(18)),
          SizedBox(
            height: chartH,
            child: isLoading
                ? _Shimmer(width: double.infinity, height: chartH)
                : flows.isEmpty
                ? Center(
                    child: Text(
                      'No data',
                      style: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
                    ),
                  )
                : Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: flows
                        .map(
                          (f) => Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    _GlowBar(
                                      frac: f.expenseFrac,
                                      color: T.red,
                                      chartH: chartH,
                                    ),
                                    SizedBox(width: R.p(3)),
                                    _GlowBar(
                                      frac: f.creditFrac,
                                      color: T.green,
                                      chartH: chartH,
                                    ),
                                  ],
                                ),
                                SizedBox(height: R.p(7)),
                                Text(
                                  f.month,
                                  style: TextStyle(
                                    color: T.textMuted,
                                    fontSize: R.fs(10),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                  ),
          ),
          SizedBox(height: R.p(14)),
          Row(
            children: [
              _LDot(T.red, 'Expense'),
              SizedBox(width: R.p(20)),
              _LDot(T.green, 'Credit'),
            ],
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPENSE PIE CHART
// ═══════════════════════════════════════════════════════════════

// Colors to cycle through for categories
const _kCatColors = [
  Color(0xFF6C63FF), // accent-ish
  Color(0xFF9C8FFF), // accent soft
  Color(0xFFF5A623), // gold
  Color(0xFFFF5B5B), // red
  Color(0xFF4CAF82), // green
  Color(0xFF26C6DA), // teal
  Color(0xFFFF7043), // orange
];

class _ExpenseRow extends StatelessWidget {
  final DashboardNotifier dn;
  const _ExpenseRow({required this.dn});

  @override
  Widget build(BuildContext context) {
    final cats = dn.expenseCategories;
    final isLoading = dn.loading && cats.isEmpty;
    final pieSize = R.w(36).clamp(120.0, 160.0);

    // Build segments with colors
    final segs = List.generate(
      cats.length > 5 ? 5 : cats.length,
      (i) => _Seg(
        cats[i].label,
        cats[i].fraction,
        _kCatColors[i % _kCatColors.length],
      ),
    );

    final totalExpStr = dn.loading ? '—' : '₹${_fmtInt(dn.totalExpense)}';

    return _SCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Monthly Expense',
                style: TextStyle(
                  color: T.textPrimary,
                  fontSize: R.fs(16),
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
              ),
              const Spacer(),
              Text(
                '${_monthName(DateTime.now().month)} ${DateTime.now().year}',
                style: TextStyle(color: T.textSecondary, fontSize: R.fs(12)),
              ),
            ],
          ),
          SizedBox(height: R.p(18)),
          isLoading
              ? _Shimmer(width: double.infinity, height: pieSize)
              : cats.isEmpty
              ? Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: R.p(20)),
                    child: Text(
                      'No expenses this month',
                      style: TextStyle(color: T.textMuted, fontSize: R.fs(13)),
                    ),
                  ),
                )
              : Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: pieSize,
                      height: pieSize,
                      child: CustomPaint(
                        painter: _PiePainter(segs),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              FittedBox(
                                child: Text(
                                  totalExpStr,
                                  style: TextStyle(
                                    color: T.textPrimary,
                                    fontSize: R.fs(12),
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.5,
                                  ),
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
                    SizedBox(width: R.p(20)),
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
                                          fontSize: R.fs(12),
                                          fontWeight: FontWeight.w500,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Text(
                                      '${(s.value * 100).toInt()}%',
                                      style: TextStyle(
                                        color: s.color,
                                        fontSize: R.fs(12),
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

  static String _fmtInt(double v) {
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
}

// ═══════════════════════════════════════════════════════════════
// RECENT TRANSACTIONS — Income / Expense split, preview + See All
// Replace the existing _RecentTransactions class in dashboard_screen.dart
// ═══════════════════════════════════════════════════════════════
class _RecentTransactions extends StatefulWidget {
  final DashboardNotifier dn;
  const _RecentTransactions({required this.dn});

  @override
  State<_RecentTransactions> createState() => _RecentTransactionsState();
}

class _RecentTransactionsState extends State<_RecentTransactions> {
  int _tab = 0; // 0 = All  1 = Income  2 = Expense
  bool _showAll = false; // false = preview (5), true = all

  static const int _previewCount = 5;

  static IconData _iconForCategory(String cat) {
    final c = cat.toLowerCase();
    if (c.contains('food') || c.contains('dining') || c.contains('restaurant'))
      return Icons.fastfood_rounded;
    if (c.contains('income') || c.contains('salary') || c.contains('credit'))
      return Icons.account_balance_rounded;
    if (c.contains('transport') || c.contains('travel') || c.contains('cab'))
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
    if (c.contains('freelance') || c.contains('other-income'))
      return Icons.work_rounded;
    return Icons.currency_rupee_rounded;
  }

  // Reset _showAll whenever the tab changes so each tab starts collapsed
  void _switchTab(int tab) {
    setState(() {
      _tab = tab;
      _showAll = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final dn = widget.dn;
    final isLoading = dn.loading;

    // Full list for the active tab
    final List<TransactionModel> allTxns = _tab == 0
        ? dn.recentTxns
        : _tab == 1
        ? dn.incomeTxns
        : dn.expenseTxns;

    // Slice shown on screen
    final List<TransactionModel> visibleTxns = _showAll
        ? allTxns
        : allTxns.take(_previewCount).toList();

    final bool hasMore = !_showAll && allTxns.length > _previewCount;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Header ──────────────────────────────────────────────
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
              onTap: () => setState(() => _showAll = !_showAll),
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

        // ── Tab Switcher ─────────────────────────────────────────
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
                count: dn.recentTxns.length,
                active: _tab == 0,
                onTap: () => _switchTab(0),
                color: T.accent,
              ),
              SizedBox(width: R.p(4)),
              _TabItem(
                label: 'Income',
                count: dn.incomeTxns.length,
                active: _tab == 1,
                onTap: () => _switchTab(1),
                color: T.green,
              ),
              SizedBox(width: R.p(4)),
              _TabItem(
                label: 'Expense',
                count: dn.expenseTxns.length,
                active: _tab == 2,
                onTap: () => _switchTab(2),
                color: T.red,
              ),
            ],
          ),
        ),
        SizedBox(height: R.p(10)),

        // ── List card ────────────────────────────────────────────
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
          child: isLoading && allTxns.isEmpty
              ? _buildShimmer()
              : allTxns.isEmpty
              ? _buildEmpty()
              : Column(
                  children: [
                    _buildList(visibleTxns),

                    // ── "See all N transactions" footer ───────
                    if (hasMore) ...[
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: R.p(16)),
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
                          onTap: () => setState(() => _showAll = true),
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: R.p(14)),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'See all ${allTxns.length} transactions',
                                  style: TextStyle(
                                    color: T.accent,
                                    fontSize: R.fs(13),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                SizedBox(width: R.p(4)),
                                Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  color: T.accent,
                                  size: R.fs(16),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],

                    // ── "Show less" footer when fully expanded ─
                    if (_showAll && allTxns.length > _previewCount) ...[
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: R.p(16)),
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
                          onTap: () => setState(() => _showAll = false),
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: R.p(14)),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Show less',
                                  style: TextStyle(
                                    color: T.textSecondary,
                                    fontSize: R.fs(13),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                SizedBox(width: R.p(4)),
                                Icon(
                                  Icons.keyboard_arrow_up_rounded,
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
      ],
    );
  }

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
                _Shimmer(width: R.p(42), height: R.p(42), radius: R.r(14)),
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
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    final label = _tab == 1
        ? 'No income transactions'
        : _tab == 2
        ? 'No expense transactions'
        : 'No transactions yet';
    return Padding(
      padding: EdgeInsets.symmetric(vertical: R.p(32)),
      child: Center(
        child: Column(
          children: [
            Icon(
              _tab == 1
                  ? Icons.account_balance_outlined
                  : _tab == 2
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

  Widget _buildList(List<TransactionModel> txns) {
    return Column(
      children: List.generate(txns.length, (i) {
        final t = txns[i];
        final c = t.isCredit ? T.green : T.red;
        final icon = _iconForCategory(t.category);

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
                        width: R.p(42).clamp(36.0, 48.0),
                        height: R.p(42).clamp(36.0, 48.0),
                        decoration: BoxDecoration(
                          color: c.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(R.r(14)),
                        ),
                        child: Icon(icon, color: c, size: R.fs(19)),
                      ),
                      SizedBox(width: R.p(12)),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              t.title,
                              style: TextStyle(
                                color: T.textPrimary,
                                fontSize: R.fs(14),
                                fontWeight: FontWeight.w600,
                                letterSpacing: -0.2,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            SizedBox(height: R.p(3)),
                            Row(
                              children: [
                                Text(
                                  t.category,
                                  style: TextStyle(
                                    color: T.textMuted,
                                    fontSize: R.fs(11),
                                  ),
                                ),
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
                                  t.relativeDate,
                                  style: TextStyle(
                                    color: T.textMuted,
                                    fontSize: R.fs(11),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      SizedBox(width: R.p(8)),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            t.formattedAmount,
                            style: TextStyle(
                              color: c,
                              fontSize: R.fs(14),
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                            ),
                          ),
                          SizedBox(height: R.p(3)),
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: R.p(6),
                              vertical: R.p(2),
                            ),
                            decoration: BoxDecoration(
                              color: c.withOpacity(0.10),
                              borderRadius: BorderRadius.circular(R.r(4)),
                            ),
                            child: Text(
                              t.isCredit ? 'IN' : 'OUT',
                              style: TextStyle(
                                color: c,
                                fontSize: R.fs(9),
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
                        ],
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
      }),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// TAB ITEM
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
          fontSize: R.fs(10),
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData icon;
  final bool loading;
  const _MiniStat(this.label, this.value, this.color, this.icon, this.loading);
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: R.fs(11)),
              SizedBox(width: R.p(3)),
              Text(
                label,
                style: TextStyle(
                  color: T.textSecondary,
                  fontSize: R.fs(10),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          SizedBox(height: R.p(4)),
          loading
              ? _Shimmer(width: R.p(50), height: R.fs(13))
              : FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    value,
                    style: TextStyle(
                      color: color,
                      fontSize: R.fs(13),
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                    ),
                  ),
                ),
        ],
      ),
    );
  }
}

class _GlowBar extends StatelessWidget {
  final double frac, chartH;
  final Color color;
  const _GlowBar({
    required this.frac,
    required this.color,
    required this.chartH,
  });
  @override
  Widget build(BuildContext context) {
    final bw = R.w(2.8).clamp(9.0, 16.0);
    final bh = (frac * chartH * 0.82).clamp(6.0, chartH * 0.85);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      width: bw,
      height: bh,
      decoration: BoxDecoration(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        color: color.withOpacity(0.9),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
    );
  }
}

class _LDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LDot(this.color, this.label);
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Container(
        width: R.p(10),
        height: R.p(10),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(3),
        ),
      ),
      SizedBox(width: R.p(6)),
      Text(
        label,
        style: TextStyle(
          color: T.textSecondary,
          fontSize: R.fs(12),
          fontWeight: FontWeight.w500,
        ),
      ),
    ],
  );
}

class _Seg {
  final String label;
  final double value;
  final Color color;
  const _Seg(this.label, this.value, this.color);
}

class _PiePainter extends CustomPainter {
  final List<_Seg> segs;
  const _PiePainter(this.segs);
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2, cy = size.height / 2;
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

class _PillBtn extends StatelessWidget {
  final String label;
  const _PillBtn(this.label);
  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      padding: EdgeInsets.symmetric(horizontal: R.p(12), vertical: R.p(5)),
      decoration: BoxDecoration(
        color: T.elevated,
        borderRadius: BorderRadius.circular(R.r(8)),
        border: Border.all(color: T.border, width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: T.textSecondary,
          fontSize: R.fs(12),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ─── Animated shimmer placeholder ────────────────────────────
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
