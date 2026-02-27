import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/theme/dark.dart';
import 'package:mobile/theme/theme.dart';

// ═══════════════════════════════════════════════════════════════
// DASHBOARD SCREEN
// Pure content screen — no nav bar. Hosted inside HomeScreen's
// IndexedStack at index 0.
// ═══════════════════════════════════════════════════════════════
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
                  _DashHeader(),
                  SizedBox(height: R.p(20)),
                  _AccountCard(),
                  SizedBox(height: R.p(16)),
                  _QuickStats(),
                  SizedBox(height: R.p(16)),
                  _CashflowCard(),
                  SizedBox(height: R.p(16)),
                  _ExpenseRow(),
                  SizedBox(height: R.p(16)),
                  _RecentTransactions(),
                  SizedBox(height: R.p(8)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════════════════════════
class _ThemeToggle extends StatelessWidget {
  const _ThemeToggle();

  @override
  Widget build(BuildContext context) {
    final notifier = ThemeProvider.of(context);
    final isDark = notifier.isDark;
    final w = R.p(52).clamp(46.0, 58.0);
    final h = R.p(28).clamp(24.0, 32.0);
    final knobSize = h - 6;

    return GestureDetector(
      onTap: notifier.toggle,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        width: w,
        height: h,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(h),
          gradient: isDark
              ? const LinearGradient(
                  colors: [DarkTokens.accent, DarkTokens.accentSoft],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                )
              : const LinearGradient(
                  colors: [Color(0xFFFFD060), Color(0xFFFF9940)],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
          boxShadow: [
            BoxShadow(
              color: (isDark ? DarkTokens.accent : const Color(0xFFFFAA30))
                  .withOpacity(0.4),
              blurRadius: 12,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Stack(
          children: [
            AnimatedAlign(
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeInOutBack,
              alignment:
                  isDark ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                width: knobSize,
                height: knobSize,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 6,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Center(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      isDark
                          ? Icons.nightlight_round
                          : Icons.wb_sunny_rounded,
                      key: ValueKey(isDark),
                      size: knobSize * 0.55,
                      color: isDark
                          ? DarkTokens.accent
                          : const Color(0xFFFF9940),
                    ),
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

// ═══════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════
class _DashHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final av = R.p(44).clamp(38.0, 52.0);
    return Row(
      children: [
        // Avatar
        Container(
          width: av,
          height: av,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [T.accent, T.accentSoft],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: T.accent.withOpacity(0.35),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Text(
              'V',
              style: TextStyle(
                color: Colors.white,
                fontSize: R.fs(18),
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
          ),
        ),
        SizedBox(width: R.p(12)),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Good Evening,',
                style: TextStyle(
                  color: T.textSecondary,
                  fontSize: R.fs(11),
                  letterSpacing: 0.3,
                ),
              ),
              SizedBox(height: R.p(2)),
              Text(
                'Vedant Sanjay Kolte',
                style: TextStyle(
                  color: T.textPrimary,
                  fontSize: R.fs(15),
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        const _ThemeToggle(),
        SizedBox(width: R.p(8)),
        _NIcon(icon: Icons.notifications_outlined, badge: true),
      ],
    );
  }
}

class _NIcon extends StatelessWidget {
  final IconData icon;
  final bool badge;
  const _NIcon({required this.icon, this.badge = false});

  @override
  Widget build(BuildContext context) {
    final s = R.p(38).clamp(34.0, 44.0);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: T.elevated,
          borderRadius: BorderRadius.circular(R.r(12)),
          child: InkWell(
            borderRadius: BorderRadius.circular(R.r(12)),
            onTap: () {},
            child: Container(
              width: s,
              height: s,
              decoration: BoxDecoration(
                border: Border.all(color: T.border, width: 1),
                borderRadius: BorderRadius.circular(R.r(12)),
              ),
              child: Icon(icon, color: T.textSecondary, size: R.fs(18)),
            ),
          ),
        ),
        if (badge)
          Positioned(
            top: -2,
            right: -2,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: T.red,
                shape: BoxShape.circle,
                border: Border.all(color: T.bg, width: 1.5),
              ),
            ),
          ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNT CARD
// ═══════════════════════════════════════════════════════════════
class _AccountCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
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
                  colors: [
                    T.accentSoft.withOpacity(0.14),
                    Colors.transparent,
                  ],
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
                    _Chip('SAVINGS', T.accent),
                    const Spacer(),
                    Icon(
                      Icons.more_horiz_rounded,
                      color: T.textSecondary,
                      size: R.fs(20),
                    ),
                  ],
                ),
                SizedBox(height: R.p(14)),
                Text(
                  "Ved's Main Account",
                  style: TextStyle(
                    color: T.textSecondary,
                    fontSize: R.fs(12),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: R.p(4)),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '₹1,24,857.40',
                    style: TextStyle(
                      color: T.textPrimary,
                      fontSize: R.fs(34),
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1.5,
                    ),
                  ),
                ),
                SizedBox(height: R.p(6)),
                Row(
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: R.p(6),
                        vertical: R.p(3),
                      ),
                      decoration: BoxDecoration(
                        color: T.green.withOpacity(0.14),
                        borderRadius: BorderRadius.circular(R.r(6)),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.arrow_upward_rounded,
                            color: T.green,
                            size: R.fs(11),
                          ),
                          SizedBox(width: R.p(2)),
                          Text(
                            '+3.2%',
                            style: TextStyle(
                              color: T.green,
                              fontSize: R.fs(11),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: R.p(8)),
                    Text(
                      'vs last month',
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _MiniStat(
                      'Income',
                      '₹38,200',
                      T.green,
                      Icons.arrow_downward_rounded,
                    ),
                    Container(width: 1, height: 32, color: T.border),
                    _MiniStat(
                      'Expenses',
                      '₹12,450',
                      T.red,
                      Icons.arrow_upward_rounded,
                    ),
                    Container(width: 1, height: 32, color: T.border),
                    _MiniStat(
                      'Saved',
                      '₹25,750',
                      T.gold,
                      Icons.savings_outlined,
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
  const _MiniStat(this.label, this.value, this.color, this.icon);
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
          FittedBox(
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

// ═══════════════════════════════════════════════════════════════
// QUICK STATS PILLS
// ═══════════════════════════════════════════════════════════════
class _QuickStats extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final stats = [
      {
        'label': 'EMI Due',
        'value': '₹3,200',
        'sub': '5 days left',
        'c': T.red,
      },
      {'label': 'Goal', 'value': '68%', 'sub': 'Complete', 'c': T.green},
      {
        'label': 'Invest',
        'value': '₹5,000',
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
            margin:
                EdgeInsets.only(right: i < stats.length - 1 ? R.p(10) : 0),
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
                FittedBox(
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
}

// ═══════════════════════════════════════════════════════════════
// CASHFLOW CHART
// ═══════════════════════════════════════════════════════════════
class _CashflowCard extends StatelessWidget {
  static const _months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
  static const _expenses = [0.60, 0.80, 0.50, 0.70, 0.40, 0.55];
  static const _credits = [0.90, 0.70, 0.85, 0.60, 0.95, 0.75];

  @override
  Widget build(BuildContext context) {
    final chartH = R.h(16).clamp(110.0, 160.0);
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
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(
                _months.length,
                (i) => Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _GlowBar(
                            frac: _expenses[i],
                            color: T.red,
                            chartH: chartH,
                          ),
                          SizedBox(width: R.p(3)),
                          _GlowBar(
                            frac: _credits[i],
                            color: T.green,
                            chartH: chartH,
                          ),
                        ],
                      ),
                      SizedBox(height: R.p(7)),
                      Text(
                        _months[i],
                        style: TextStyle(
                          color: T.textMuted,
                          fontSize: R.fs(10),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
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

// ═══════════════════════════════════════════════════════════════
// EXPENSE BREAKDOWN PIE
// ═══════════════════════════════════════════════════════════════
class _ExpenseRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final segs = [
      _Seg('Food', 0.30, T.accent),
      _Seg('Transport', 0.20, T.accentSoft),
      _Seg('Shopping', 0.25, T.gold),
      _Seg('Bills', 0.15, T.red),
      _Seg('Others', 0.10, T.textSecondary),
    ];
    final pieSize = R.w(36).clamp(120.0, 160.0);

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
                'Feb 2026',
                style: TextStyle(
                  color: T.textSecondary,
                  fontSize: R.fs(12),
                ),
              ),
            ],
          ),
          SizedBox(height: R.p(18)),
          Row(
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
                            '₹12,450',
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
      path.moveTo(
        cx + innerR * math.cos(angle),
        cy + innerR * math.sin(angle),
      );
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

// ═══════════════════════════════════════════════════════════════
// RECENT TRANSACTIONS
// ═══════════════════════════════════════════════════════════════
class _TxnData {
  final String title, category, amount, date;
  final Color Function() colorFn;
  final IconData icon;
  const _TxnData(
    this.title,
    this.category,
    this.amount,
    this.colorFn,
    this.icon,
    this.date,
  );
}

class _RecentTransactions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final txns = [
      _TxnData(
        'Swiggy',
        'Food & Dining',
        '-₹340',
        () => T.red,
        Icons.fastfood_rounded,
        'Today',
      ),
      _TxnData(
        'Salary Credit',
        'Income',
        '+₹38,200',
        () => T.green,
        Icons.account_balance_rounded,
        'Yesterday',
      ),
      _TxnData(
        'Uber',
        'Transport',
        '-₹180',
        () => T.red,
        Icons.directions_car_rounded,
        'Yesterday',
      ),
      _TxnData(
        'Netflix',
        'Subscriptions',
        '-₹649',
        () => T.gold,
        Icons.play_circle_rounded,
        'Feb 24',
      ),
      _TxnData(
        'Zepto',
        'Groceries',
        '-₹520',
        () => T.accentSoft,
        Icons.local_grocery_store_rounded,
        'Feb 23',
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
            Text(
              'See all',
              style: TextStyle(
                color: T.accent,
                fontSize: R.fs(13),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        SizedBox(height: R.p(12)),
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
          child: Column(
            children: List.generate(txns.length, (i) {
              final t = txns[i];
              final c = t.colorFn();
              return Column(
                children: [
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.vertical(
                        top: i == 0
                            ? Radius.circular(R.r(20))
                            : Radius.zero,
                        bottom: i == txns.length - 1
                            ? Radius.circular(R.r(20))
                            : Radius.zero,
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
                                borderRadius:
                                    BorderRadius.circular(R.r(14)),
                              ),
                              child: Icon(
                                t.icon,
                                color: c,
                                size: R.fs(19),
                              ),
                            ),
                            SizedBox(width: R.p(12)),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
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
                                        t.date,
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
                            Text(
                              t.amount,
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
                      padding:
                          EdgeInsets.symmetric(horizontal: R.p(16)),
                      child: Divider(
                        color: T.border.withOpacity(0.6),
                        height: 1,
                      ),
                    ),
                ],
              );
            }),
          ),
        ),
      ],
    );
  }
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