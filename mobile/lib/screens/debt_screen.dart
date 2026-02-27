import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/theme/theme.dart';

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
              padding: EdgeInsets.fromLTRB(R.p(20), R.p(10), R.p(20), R.p(24)),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _DebtOverviewTitle(),
                  SizedBox(height: R.p(14)),
                  _StatGrid(),
                  SizedBox(height: R.p(16)),
                  _DebtCompositionCard(),
                  SizedBox(height: R.p(16)),
                  _DebtReductionChart(),
                  SizedBox(height: R.p(16)),
                  _ProjectedPayoffCard(),
                  SizedBox(height: R.p(16)),
                  _AiInsightsCard(),
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
// 2×2 STAT GRID  (Total Debt / DTI / Credit Score / DTA)
// ═══════════════════════════════════════════════════════════════
class _StatGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final stats = [
      _StatData(
        'Total Debt',
        '₹4,20,000',
        Icons.account_balance_wallet_rounded,
        T.red,
        '-₹8,200 this month',
      ),
      _StatData(
        'Debt to Income',
        '34%',
        Icons.trending_down_rounded,
        T.gold,
        'Moderate risk',
      ),
      _StatData(
        'Credit Score',
        '742',
        Icons.verified_rounded,
        T.green,
        'Good standing',
      ),
      _StatData(
        'Debt to Asset',
        '28%',
        Icons.pie_chart_rounded,
        T.accent,
        'Healthy ratio',
      ),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: R.p(12),
      mainAxisSpacing: R.p(12),
      childAspectRatio: 1.55,
      children: stats.map((s) => _StatCard(s)).toList(),
    );
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
                width: R.p(28).clamp(24.0, 34.0),
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
  @override
  Widget build(BuildContext context) {
    final segs = [
      _Seg('Home Loan', 0.52, T.accent),
      _Seg('Car Loan', 0.18, T.accentSoft),
      _Seg('Personal', 0.15, T.gold),
      _Seg('Credit Card', 0.10, T.red),
      _Seg('Other', 0.05, T.textSecondary),
    ];
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
                          '₹4.2L',
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
}

// ═══════════════════════════════════════════════════════════════
// DEBT REDUCTION HISTORY BAR CHART
// ═══════════════════════════════════════════════════════════════
class _DebtReductionChart extends StatelessWidget {
  static const _years = ['2022', '2023', '2024', '2025', '2026'];
  static const _fracs = [1.0, 0.82, 0.65, 0.44, 0.28];

  @override
  Widget build(BuildContext context) {
    final chartH = R.h(20).clamp(120.0, 170.0);
    return _SCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardHeader('Debt Reduction History', '5Y'),
          SizedBox(height: R.p(18)),
          // Y-axis label
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Y-axis
              Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: ['4.2L', '3L', '2L', '1L', '0']
                    .map(
                      (l) => SizedBox(
                        height: chartH / 5,
                        child: Text(
                          l,
                          style: TextStyle(
                            color: T.textMuted,
                            fontSize: R.fs(8),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
              SizedBox(width: R.p(8)),
              // Bars
              Expanded(
                child: SizedBox(
                  height: 200,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: List.generate(_years.length, (i) {
                      final frac = _fracs[i];
                      final isLatest = i == _years.length - 1;
                      return Expanded(
                        child: Padding(
                          padding: EdgeInsets.symmetric(horizontal: R.p(4)),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              // Amount label on top of bar
                              Text(
                                _amountLabel(frac),
                                style: TextStyle(
                                  color: isLatest ? T.accent : T.textMuted,
                                  fontSize: R.fs(8),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              SizedBox(height: R.p(3)),
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 500),
                                height: (frac * chartH * 0.88).clamp(
                                  4.0,
                                  chartH,
                                ),
                                decoration: BoxDecoration(
                                  borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(6),
                                  ),
                                  gradient: LinearGradient(
                                    colors: isLatest
                                        ? [T.accent, T.accentSoft]
                                        : [
                                            T.red.withOpacity(0.85),
                                            T.red.withOpacity(0.5),
                                          ],
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: (isLatest ? T.accent : T.red)
                                          .withOpacity(0.3),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(height: R.p(6)),
                              Text(
                                _years[i],
                                style: TextStyle(
                                  color: T.textMuted,
                                  fontSize: R.fs(9),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: R.p(12)),
          // Legend
          Row(
            children: [
              _LDot(T.red, 'Outstanding Debt'),
              SizedBox(width: R.p(20)),
              _LDot(T.accent, 'Current Year'),
            ],
          ),
        ],
      ),
    );
  }

  String _amountLabel(double frac) {
    final val = (frac * 4.2).toStringAsFixed(1);
    return '₹${val}L';
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
          fontSize: R.fs(11),
          fontWeight: FontWeight.w500,
        ),
      ),
    ],
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECTED PAYOFF TIMELINE
// ═══════════════════════════════════════════════════════════════
class _ProjectedPayoffCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final loans = [
      _LoanPayoff('Home Loan', '2031', 0.72, T.accent),
      _LoanPayoff('Car Loan', '2027', 0.38, T.accentSoft),
      _LoanPayoff('Personal Loan', '2026', 0.15, T.gold),
      _LoanPayoff('Credit Card', 'Overdue', 0.05, T.red),
    ];

    return _SCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardHeader('Projected Payoff Timeline', null),
          SizedBox(height: R.p(16)),
          ...loans.map(
            (l) => Padding(
              padding: EdgeInsets.only(bottom: R.p(14)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          l.name,
                          style: TextStyle(
                            color: T.textPrimary,
                            fontSize: R.fs(13),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: R.p(8),
                          vertical: R.p(3),
                        ),
                        decoration: BoxDecoration(
                          color: l.color.withOpacity(0.14),
                          borderRadius: BorderRadius.circular(R.r(6)),
                        ),
                        child: Text(
                          l.year,
                          style: TextStyle(
                            color: l.color,
                            fontSize: R.fs(11),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: R.p(8)),
                  // Progress bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(R.r(6)),
                    child: Stack(
                      children: [
                        Container(height: 6, color: T.border.withOpacity(0.6)),
                        FractionallySizedBox(
                          widthFactor: l.progress,
                          child: Container(
                            height: 6,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [l.color, l.color.withOpacity(0.6)],
                              ),
                              borderRadius: BorderRadius.circular(R.r(6)),
                              boxShadow: [
                                BoxShadow(
                                  color: l.color.withOpacity(0.4),
                                  blurRadius: 6,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: R.p(4)),
                  Text(
                    '${(l.progress * 100).toInt()}% paid off',
                    style: TextStyle(color: T.textMuted, fontSize: R.fs(10)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoanPayoff {
  final String name, year;
  final double progress;
  final Color color;
  const _LoanPayoff(this.name, this.year, this.progress, this.color);
}

// ═══════════════════════════════════════════════════════════════
// AI INSIGHTS CARD
// ═══════════════════════════════════════════════════════════════
class _AiInsightsCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final insights = [
      _Insight(
        Icons.lightbulb_rounded,
        'Avalanche Strategy',
        'Pay ₹2,000 extra on your Credit Card to save ₹18,400 in interest.',
        T.gold,
      ),
      _Insight(
        Icons.trending_up_rounded,
        'Score Boost',
        'Reducing CC utilisation below 30% could raise your score by ~40 pts.',
        T.green,
      ),
      _Insight(
        Icons.calendar_month_rounded,
        'Early Payoff',
        'Increasing EMI by ₹3,000/mo will clear your Car Loan 14 months early.',
        T.accent,
      ),
    ];

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
