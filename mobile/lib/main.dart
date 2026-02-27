import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:mobile/screens/home_screen.dart';
import 'package:mobile/screens/login/welcome_screen.dart';
import 'package:mobile/services/clerk_service.dart';
import 'package:mobile/theme/dark.dart';
import 'package:mobile/theme/light.dart';
import 'package:mobile/theme/theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized(); // ← must be first
  await Supabase.initialize(
    url: 'https://fstsmsctqrypxnxhsfgh.supabase.co',
    anonKey: 'sb_publishable_EiT7dnIuSsq683PC28EVPw_L5VBmiEk',
  );
  // await ClerkAuthService.init(
  //   'pk_test_aW50ZW5zZS1oYWRkb2NrLTMxLmNsZXJrLmFjY291bnRzLmRldiQ',
  // );
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(
    ClerkAuth(
      config: ClerkAuthConfig(
        publishableKey:
            'pk_test_aW50ZW5zZS1oYWRkb2NrLTMxLmNsZXJrLmFjY291bnRzLmRldiQ',
      ),
      child: const ThemeProvider(child: FinanceApp()),
    ),
  );
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
        home: ClerkAuthBuilder(
          signedInBuilder: (context, authState) {
            return const HomeScreen();
          },
          signedOutBuilder: (context, authState) {
            return const WelcomeScreen();
          },
        ),
      ),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    // 1. Check the auth state synchronously.
    // This is instantly available because we awaited init() in main.
    final isLoggedIn = ClerkAuthService.isSignedIn();

    // 2. Route the user immediately
    return isLoggedIn ? const HomeScreen() : const WelcomeScreen();
  }
}
