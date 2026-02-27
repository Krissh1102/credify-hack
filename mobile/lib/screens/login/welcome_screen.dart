import 'dart:math' as math;
import 'package:flutter/material.dart';

import 'package:mobile/theme/theme.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with TickerProviderStateMixin {
  late AnimationController _entryAc;
  late AnimationController _floatAc;
  late AnimationController _pulseAc;
  late Animation<double> _fadeIn;
  late Animation<Offset> _slideUp;
  late Animation<double> _scale;
  late Animation<double> _float;
  late Animation<double> _pulse;

  @override
  void initState() {
    super.initState();
    _entryAc = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _floatAc = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat(reverse: true);
    _pulseAc = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _fadeIn = CurvedAnimation(
      parent: _entryAc,
      curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
    );
    _slideUp = Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _entryAc,
            curve: const Interval(0.1, 0.75, curve: Curves.easeOutCubic),
          ),
        );
    _scale = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryAc,
        curve: const Interval(0.0, 0.65, curve: Curves.easeOutBack),
      ),
    );
    _float = Tween<double>(
      begin: -6.0,
      end: 6.0,
    ).animate(CurvedAnimation(parent: _floatAc, curve: Curves.easeInOut));
    _pulse = Tween<double>(
      begin: 0.92,
      end: 1.08,
    ).animate(CurvedAnimation(parent: _pulseAc, curve: Curves.easeInOut));

    _entryAc.forward();
  }

  @override
  void dispose() {
    _entryAc.dispose();
    _floatAc.dispose();
    _pulseAc.dispose();
    super.dispose();
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
          child: Stack(
            children: [
              // Background decorative blobs
              _BackgroundBlobs(),

              // Main content with SingleChildScrollView to prevent overflow
              FadeTransition(
                opacity: _fadeIn,
                child: SlideTransition(
                  position: _slideUp,
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight:
                            MediaQuery.of(context).size.height -
                            MediaQuery.of(context).padding.top -
                            MediaQuery.of(context).padding.bottom,
                      ),
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: R.p(24)),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              children: [
                                SizedBox(height: 100),

                                // Logo / Hero graphic
                                AnimatedBuilder(
                                  animation: Listenable.merge([
                                    _floatAc,
                                    _entryAc,
                                  ]),
                                  builder: (context, child) {
                                    return Transform.translate(
                                      offset: Offset(0, _float.value),
                                      child: ScaleTransition(
                                        scale: _scale,
                                        child: child,
                                      ),
                                    );
                                  },
                                  child: _HeroGraphic(pulseAnim: _pulse),
                                ),

                                SizedBox(height: R.h(3)),

                                // Feature pills row
                                ScaleTransition(
                                  scale: _scale,
                                  child: _FeaturePills(),
                                ),

                                SizedBox(height: R.h(3)),

                                // Headline
                                ScaleTransition(
                                  scale: _scale,
                                  child: Column(
                                    children: [
                                      SizedBox(height: 40),
                                      ShaderMask(
                                        shaderCallback: (bounds) =>
                                            LinearGradient(
                                              colors: [T.textPrimary, T.accent],
                                              begin: Alignment.centerLeft,
                                              end: Alignment.centerRight,
                                            ).createShader(bounds),
                                        child: Text(
                                          'Your Money,\nMastered.',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: R
                                                .fs(42)
                                                .clamp(28.0, 38.0),
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: -1.5,
                                            height: 1.1,
                                          ),
                                        ),
                                      ),
                                      SizedBox(height: R.p(12)),
                                      Padding(
                                        padding: EdgeInsets.symmetric(
                                          horizontal: R.p(8),
                                        ),
                                        child: Text(
                                          'Track spending, grow savings,\nand reach your goals — effortlessly.',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            color: T.textSecondary,
                                            fontSize: R
                                                .fs(14)
                                                .clamp(13.0, 15.0),
                                            height: 1.5,
                                            letterSpacing: 0.1,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            // Bottom section
                            Column(
                              children: [
                                SizedBox(height: R.h(3)),

                                // CTA Buttons
                                ScaleTransition(
                                  scale: _scale,
                                  child: _CTAButtons(),
                                ),

                                SizedBox(height: R.p(16)),

                                // Footer note
                                Text(
                                  'Trusted by 10,000+ users · 4.9 ★ rating',
                                  style: TextStyle(
                                    color: T.textMuted,
                                    fontSize: R.fs(11).clamp(10.0, 12.0),
                                  ),
                                ),

                                SizedBox(height: R.p(16)),
                              ],
                            ),
                          ],
                        ),
                      ),
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
}

// ─── Background decorative blobs ────────────────────────────────

class _BackgroundBlobs extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: IgnorePointer(child: CustomPaint(painter: _BlobPainter())),
    );
  }
}

class _BlobPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p1 = Paint()
      ..color = T.accent.withOpacity(0.07)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 60);
    final p2 = Paint()
      ..color = T.accentSoft.withOpacity(0.05)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 80);
    final p3 = Paint()
      ..color = T.gold.withOpacity(0.05)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 70);

    canvas.drawCircle(
      Offset(size.width * 0.85, size.height * 0.12),
      size.width * 0.45,
      p1,
    );
    canvas.drawCircle(
      Offset(size.width * 0.1, size.height * 0.35),
      size.width * 0.38,
      p2,
    );
    canvas.drawCircle(
      Offset(size.width * 0.55, size.height * 0.78),
      size.width * 0.32,
      p3,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter _) => false;
}

// ─── Hero Graphic ────────────────────────────────────────────────

class _HeroGraphic extends StatelessWidget {
  final Animation<double> pulseAnim;

  const _HeroGraphic({required this.pulseAnim});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final size = (screenWidth * 0.52).clamp(120.0, 200.0);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Outer glow ring
          AnimatedBuilder(
            animation: pulseAnim,
            builder: (_, __) => Container(
              width: size * pulseAnim.value,
              height: size * pulseAnim.value,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    T.accent.withOpacity(0.0),
                    T.accent.withOpacity(0.08),
                    T.accent.withOpacity(0.0),
                  ],
                  stops: const [0.0, 0.6, 1.0],
                ),
              ),
            ),
          ),

          // Mid ring
          Container(
            width: size * 0.78,
            height: size * 0.78,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: T.accent.withOpacity(0.12), width: 1),
            ),
          ),

          // Card graphic
          Container(
            width: size * 0.62,
            height: size * 0.62,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [T.cardGrad1, T.cardGrad2],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: T.accent.withOpacity(0.3), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: T.accent.withOpacity(0.28),
                  blurRadius: 36,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.account_balance_wallet_rounded,
                    color: T.accent,
                    size: (size * 0.18).clamp(20.0, 28.0),
                  ),
                  SizedBox(height: R.p(4)),
                  ShaderMask(
                    shaderCallback: (bounds) => LinearGradient(
                      colors: [T.accent, T.gold],
                    ).createShader(bounds),
                    child: Text(
                      '₹',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: (size * 0.18).clamp(20.0, 26.0),
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Floating mini badge — top right
          Positioned(
            top: size * 0.08,
            right: size * 0.05,
            child: _FloatingBadge(
              icon: Icons.trending_up_rounded,
              label: '+3.2%',
              color: T.green,
            ),
          ),

          // Floating mini badge — bottom left
          Positioned(
            bottom: size * 0.08,
            left: size * 0.04,
            child: _FloatingBadge(
              icon: Icons.savings_outlined,
              label: 'Saved',
              color: T.gold,
            ),
          ),
        ],
      ),
    );
  }
}

class _FloatingBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _FloatingBadge({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: R.p(7), vertical: R.p(4)),
      decoration: BoxDecoration(
        color: T.surface,
        borderRadius: BorderRadius.circular(R.r(10)),
        border: Border.all(color: color.withOpacity(0.3), width: 1),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.2),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: R.fs(10).clamp(9.0, 11.0)),
          SizedBox(width: R.p(3)),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: R.fs(10).clamp(9.0, 11.0),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Feature Pills ────────────────────────────────────────────────

class _FeaturePills extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final features = [
      (Icons.shield_rounded, 'Secure'),
      (Icons.bar_chart_rounded, 'Analytics'),
      (Icons.notifications_active_rounded, 'Alerts'),
    ];

    return Wrap(
      alignment: WrapAlignment.center,
      spacing: R.p(6),
      runSpacing: R.p(6),
      children: features
          .map(
            (f) => Container(
              padding: EdgeInsets.symmetric(
                horizontal: R.p(10),
                vertical: R.p(6),
              ),
              decoration: BoxDecoration(
                color: T.elevated,
                borderRadius: BorderRadius.circular(R.r(20)),
                border: Border.all(color: T.border, width: 1),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(f.$1, color: T.accent, size: R.fs(11).clamp(10.0, 12.0)),
                  SizedBox(width: R.p(4)),
                  Text(
                    f.$2,
                    style: TextStyle(
                      color: T.textSecondary,
                      fontSize: R.fs(10).clamp(9.0, 10.0),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

// ─── CTA Buttons ─────────────────────────────────────────────────
class _CTAButtons extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final btnH = R.p(52).clamp(48.0, 56.0);

    return Column(
      children: [
        Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(R.r(16)),
          child: InkWell(
            borderRadius: BorderRadius.circular(R.r(16)),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => Scaffold(
                    body: ClerkAuthBuilder(
                      signedInBuilder: (context, state) {
                        // Once signed in → remove auth screen
                        Future.microtask(() {
                          Navigator.pop(context);
                        });
                        return const SizedBox.shrink();
                      },
                      signedOutBuilder: (context, state) {
                        return const SafeArea(child: ClerkAuthentication());
                      },
                    ),
                  ),
                ),
              );
            },
            child: Ink(
              height: btnH,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [T.accent, T.accentSoft],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
                borderRadius: BorderRadius.circular(R.r(16)),
                boxShadow: [
                  BoxShadow(
                    color: T.accent.withOpacity(0.42),
                    blurRadius: 22,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Get Started',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: R.fs(14).clamp(13.0, 15.0),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.1,
                    ),
                  ),
                  SizedBox(width: R.p(8)),
                  Icon(
                    Icons.arrow_forward_rounded,
                    color: Colors.white,
                    size: R.fs(16).clamp(15.0, 18.0),
                  ),
                ],
              ),
            ),
          ),
        ),
        SizedBox(height: R.p(12)),
      ],
    );
  }
}
