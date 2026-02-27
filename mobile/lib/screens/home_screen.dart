import 'package:flutter/material.dart';
import 'package:mobile/screens/dashboard_screen.dart';
import 'package:mobile/screens/debt_screen.dart';
import 'package:mobile/screens/learn_screen.dart';
import 'package:mobile/screens/savings_screen.dart';
import 'package:mobile/screens/scan_screen.dart';
import 'package:mobile/theme/theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  int _navIdx = 0;

  // Keep all screens alive with IndexedStack
  static const _screens = [
    DashboardScreen(),
    DebtScreen(),
    ScanScreen(),
    SavingsScreen(),
    LearnScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    R.init(context);
    final notifier = ThemeProvider.of(context);
    T.init(notifier.isDark);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      color: T.bg,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Screen content ─────────────────────────────
              Expanded(
                child: IndexedStack(index: _navIdx, children: _screens),
              ),

              // ── Persistent bottom nav ──────────────────────
              _BottomNav(
                selected: _navIdx,
                onTap: (i) => setState(() => _navIdx = i),
                bottomInset: MediaQuery.of(context).padding.bottom,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onTap;
  final double bottomInset;

  const _BottomNav({
    required this.selected,
    required this.onTap,
    required this.bottomInset,
  });

  static const _items = [
    (Icons.space_dashboard_rounded, 'Dashboard'),
    (Icons.credit_card_rounded, 'Debts'),
    (Icons.document_scanner_rounded, 'Scan'),
    (Icons.savings_rounded, 'Savings'),
    (Icons.auto_graph_rounded, 'Learn'),
  ];

  @override
  Widget build(BuildContext context) {
    final bot = bottomInset > 0 ? bottomInset : R.p(8);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      padding: EdgeInsets.fromLTRB(
        R.p(16).clamp(0.0, 32.0),
        R.p(12).clamp(0.0, 24.0),
        R.p(16).clamp(0.0, 32.0),
        bot.clamp(0.0, 64.0),
      ),
      decoration: BoxDecoration(
        color: T.surface,
        border: Border(top: BorderSide(color: T.border, width: 1)),
        boxShadow: [
          BoxShadow(
            color: T.border.withOpacity(0.5),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(_items.length, (i) {
          final item = _items[i];
          final isScan = i == 2;
          final isSel = selected == i;

          // ── Centre scan FAB ───────────────────────────────
          if (isScan) {
            return GestureDetector(
              onTap: () => onTap(i),
              child: Container(
                width: R.p(50).clamp(44.0, 58.0),
                height: R.p(50).clamp(44.0, 58.0),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [T.accent, T.accentSoft],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(R.r(16)),
                  boxShadow: [
                    BoxShadow(
                      color: T.accent.withOpacity(0.45),
                      blurRadius: 18,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Icon(item.$1, color: Colors.white, size: R.fs(22)),
              ),
            );
          }

          // ── Regular tab ───────────────────────────────────
          return Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onTap(i),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedScale(
                    scale: isSel ? 1.15 : 1.0,
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOutBack,
                    child: Icon(
                      item.$1,
                      color: isSel ? T.accent : T.textMuted,
                      size: R.fs(22),
                    ),
                  ),
                  SizedBox(height: R.p(4).clamp(0.0, 8.0)),
                  Text(
                    item.$2,
                    style: TextStyle(
                      color: isSel ? T.accent : T.textMuted,
                      fontSize: R.fs(10),
                      fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: R.p(3).clamp(0.0, 6.0)),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutBack,
                    width: isSel ? R.p(16).clamp(0.0, 24.0) : 0,
                    height: 3,
                    decoration: BoxDecoration(
                      color: T.accent,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}
