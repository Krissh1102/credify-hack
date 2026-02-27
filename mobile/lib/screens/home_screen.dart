import 'package:flutter/material.dart';
import 'package:mobile/models/user_provider.dart';

import 'package:mobile/screens/dashboard_screen.dart';
import 'package:mobile/screens/debt_screen.dart';
import 'package:mobile/screens/learn_screen.dart';
import 'package:mobile/screens/savings_screen.dart';
import 'package:mobile/screens/scan_screen.dart';
import 'package:mobile/theme/dark.dart';
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
  void initState() {
    super.initState();
    // Load user data once when HomeScreen mounts
    WidgetsBinding.instance.addPostFrameCallback((_) {
      UserNotifier().load();
    });
  }

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
              // ── Persistent header ──────────────────────────
              Padding(
                padding: EdgeInsets.fromLTRB(
                  R.p(20),
                  R.p(10),
                  R.p(20),
                  R.p(10),
                ),
                child: const _AppHeader(),
              ),

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

// ═══════════════════════════════════════════════════════════════
// PERSISTENT APP HEADER — now driven by UserNotifier
// ═══════════════════════════════════════════════════════════════
class _AppHeader extends StatelessWidget {
  const _AppHeader();

  @override
  Widget build(BuildContext context) {
    final av = R.p(44).clamp(38.0, 52.0);

    return ListenableBuilder(
      listenable: UserNotifier(),
      builder: (context, _) {
        final un = UserNotifier();
        final user = un.user;
        final initial = user?.initial ?? '?';
        final greeting = un.greeting;
        final displayName = user?.name ?? '—';
        final imageUrl = user?.imageUrl;

        return Row(
          children: [
            // ── Avatar ──────────────────────────────────────
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
              child: ClipOval(
                child: imageUrl != null
                    ? Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            _InitialFallback(initial: initial, size: av),
                      )
                    : _InitialFallback(initial: initial, size: av),
              ),
            ),

            SizedBox(width: R.p(12)),

            // ── Name + greeting ─────────────────────────────
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    greeting,
                    style: TextStyle(
                      color: T.textSecondary,
                      fontSize: R.fs(11),
                      letterSpacing: 0.3,
                    ),
                  ),
                  SizedBox(height: R.p(2)),
                  un.loading && user == null
                      ? _ShimmerText(width: R.p(140), height: R.fs(15))
                      : Text(
                          displayName,
                          style: TextStyle(
                            fontSize: R.fs(15),
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.4,
                            color: T.textPrimary,
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
      },
    );
  }
}

// ─── Avatar initial fallback ──────────────────────────────────
class _InitialFallback extends StatelessWidget {
  final String initial;
  final double size;
  const _InitialFallback({required this.initial, required this.size});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        initial,
        style: TextStyle(
          color: Colors.white,
          fontSize: R.fs(18),
          fontWeight: FontWeight.w800,
          letterSpacing: -0.5,
        ),
      ),
    );
  }
}

// ─── Shimmer placeholder for loading state ────────────────────
class _ShimmerText extends StatefulWidget {
  final double width;
  final double height;
  const _ShimmerText({required this.width, required this.height});

  @override
  State<_ShimmerText> createState() => _ShimmerTextState();
}

class _ShimmerTextState extends State<_ShimmerText>
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
          color: T.border.withOpacity(0.4 + _anim.value * 0.4),
          borderRadius: BorderRadius.circular(4),
        ),
      ),
    );
  }
}


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
                  colors: [
                    DarkTokens.accent,
                    Color.fromARGB(255, 156, 115, 53),
                  ],
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
              alignment: isDark ? Alignment.centerRight : Alignment.centerLeft,
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
                      isDark ? Icons.nightlight_round : Icons.wb_sunny_rounded,
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
// NOTIFICATION ICON (unchanged)
// ═══════════════════════════════════════════════════════════════
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
// BOTTOM NAV (unchanged)
// ═══════════════════════════════════════════════════════════════
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

          if (isScan) {
            final double size = R.p(64);
            final double safeSize = size < 48 ? 64 : size;
            final double lift = R.p(24);

            return SizedBox(
              width: safeSize,
              height: safeSize,
              child: Transform.translate(
                offset: Offset(0, -lift),
                child: Material(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(R.r(18)),
                  ),
                  elevation: 14,
                  color: Colors.transparent,
                  shadowColor: T.accent.withOpacity(0.40),
                  child: GestureDetector(
                    onTap: () => onTap(i),
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [T.accent, T.accentSoft],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(R.r(30)),
                        boxShadow: [
                          BoxShadow(
                            color: T.accent.withOpacity(0.45),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(item.$1, color: Colors.white, size: R.fs(26)),
                    ),
                  ),
                ),
              ),
            );
          }

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
                  isSel
                      ? AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          curve: Curves.easeOutBack,
                          width: R.p(16) > 0 ? R.p(16) : 16,
                          height: 3,
                          decoration: BoxDecoration(
                            color: T.accent,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        )
                      : const SizedBox(height: 3),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}
