
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:mobile/screens/login/welcome_screen.dart';
import 'package:mobile/theme/dark.dart';
import 'package:mobile/theme/light.dart';
import 'package:mobile/theme/theme.dart';
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations(
      [DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  runApp(const ThemeProvider(child: FinanceApp()));
}


class FinanceApp extends StatelessWidget {
  const FinanceApp({super.key});

  @override
  Widget build(BuildContext context) {
    final notifier = ThemeProvider.of(context);
    return AnimatedTheme(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeInOut,
      data: notifier.isDark
          ? ThemeData.dark().copyWith(
              scaffoldBackgroundColor: DarkTokens.bg,
              splashFactory: InkRipple.splashFactory,
              colorScheme: const ColorScheme.dark(primary: DarkTokens.accent),
            )
          : ThemeData.light().copyWith(
              scaffoldBackgroundColor: LightTokens.bg,
              splashFactory: InkRipple.splashFactory,
              colorScheme: const ColorScheme.light(primary: LightTokens.accent),
            ),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Credify',
        theme: ThemeData(scaffoldBackgroundColor: Colors.transparent),
        home:  WelcomeScreen(),
      ),
    );
  }
}
