
// ═══════════════════════════════════════════════════════════════
// THEME PROVIDER — InheritedNotifier for O(1) rebuilds
// ═══════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/theme/dark.dart';
import 'package:mobile/theme/light.dart';

class ThemeNotifier extends ChangeNotifier {
  bool _isDark = true;
  bool get isDark => _isDark;

  void toggle() {
    _isDark = !_isDark;
    _updateSystemUI(_isDark);
    notifyListeners();
  }

  static void _updateSystemUI(bool dark) {
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
      systemNavigationBarColor: dark ? DarkTokens.surface : LightTokens.surface,
      systemNavigationBarIconBrightness:
          dark ? Brightness.light : Brightness.dark,
    ));
  }
}

class ThemeProvider extends StatefulWidget {
  final Widget child;
  const ThemeProvider({super.key, required this.child});

  @override
  State<ThemeProvider> createState() => _ThemeProviderState();

  static ThemeNotifier of(BuildContext context) =>
      context
          .dependOnInheritedWidgetOfExactType<_ThemeInherited>()!
          .notifier!;
}

class _ThemeProviderState extends State<ThemeProvider> {
  final _notifier = ThemeNotifier();

  @override
  void initState() {
    super.initState();
    ThemeNotifier._updateSystemUI(_notifier.isDark);
  }

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _ThemeInherited(notifier: _notifier, child: widget.child);
  }
}

class _ThemeInherited extends InheritedNotifier<ThemeNotifier> {
  const _ThemeInherited({required super.notifier, required super.child});
}

class T {
  static late bool _dark;
  static void init(bool dark) => _dark = dark;

  static Color get bg            => _dark ? DarkTokens.bg            : LightTokens.bg;
  static Color get surface       => _dark ? DarkTokens.surface       : LightTokens.surface;
  static Color get elevated      => _dark ? DarkTokens.elevated      : LightTokens.elevated;
  static Color get border        => _dark ? DarkTokens.border        : LightTokens.border;
  static Color get accent        => _dark ? DarkTokens.accent        : LightTokens.accent;
  static Color get accentSoft    => _dark ? DarkTokens.accentSoft    : LightTokens.accentSoft;
  static Color get green         => _dark ? DarkTokens.green         : LightTokens.green;
  static Color get red           => _dark ? DarkTokens.red           : LightTokens.red;
  static Color get gold          => _dark ? DarkTokens.gold          : LightTokens.gold;
  static Color get textPrimary   => _dark ? DarkTokens.textPrimary   : LightTokens.textPrimary;
  static Color get textSecondary => _dark ? DarkTokens.textSecondary : LightTokens.textSec;
  static Color get textMuted     => _dark ? DarkTokens.textMuted     : LightTokens.textMuted;
  static Color get cardGrad1     => _dark ? DarkTokens.cardGrad1     : LightTokens.cardGrad1;
  static Color get cardGrad2     => _dark ? DarkTokens.cardGrad2     : LightTokens.cardGrad2;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSIVE HELPER
// ═══════════════════════════════════════════════════════════════
class R {
  static late double _w, _h, _sp;

  static void init(BuildContext ctx) {
    final mq = MediaQuery.of(ctx);
    _w  = mq.size.width;
    _h  = mq.size.height;
    _sp = mq.textScaler.scale(1.0);
  }

  static double w(double pct) => _w * pct / 100;
  static double h(double pct) => _h * pct / 100;
  static double fs(double b)  => (b / _sp).clamp(b * 0.8, b * 1.15);
  static double p(double b)   => (b * _w / 390).clamp(b * 0.75, b * 1.2);
  static double r(double b)   => (b * _w / 390).clamp(b * 0.8, b * 1.1);
  static double get sw        => _w;
  static bool get isSmall     => _w < 360;
}