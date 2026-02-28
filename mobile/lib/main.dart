import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:mobile/models/user_provider.dart';
import 'package:mobile/provider/transaction_provider.dart';
import 'package:mobile/screens/home_screen.dart';
import 'package:mobile/screens/login/welcome_screen.dart';
import 'package:mobile/theme/dark.dart';
import 'package:mobile/theme/light.dart';
import 'package:mobile/theme/theme.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

// ✅ Global notifications instance
final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ✅ Lock orientation
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // ✅ Initialize Supabase
  await Supabase.initialize(
    url: 'https://fstsmsctqrypxnxhsfgh.supabase.co',
    anonKey: 'sb_publishable_EiT7dnIuSsq683PC28EVPw_L5VBmiEk',
  );

  // ✅ Initialize Notifications
  await _initNotifications();

  runApp(
    ClerkAuth(
      config: ClerkAuthConfig(
        publishableKey:
            'pk_test_aW50ZW5zZS1oYWRkb2NrLTMxLmNsZXJrLmFjY291bnRzLmRldiQ',
      ),
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => TransactionProvider()),
          ChangeNotifierProvider(create: (_) => UserNotifier()),
        ],
        child: const ThemeProvider(child: FinanceApp()),
      ),
    ),
  );
}

/// ✅ Notification Initialization Function
Future<void> _initNotifications() async {
  const AndroidInitializationSettings androidSettings =
      AndroidInitializationSettings('@mipmap/ic_launcher');

  const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
    requestAlertPermission: true,
    requestBadgePermission: true,
    requestSoundPermission: true,
  );

  const InitializationSettings initSettings = InitializationSettings(
    android: androidSettings,
    iOS: iosSettings,
  );

  await flutterLocalNotificationsPlugin.initialize(
    settings: initSettings,
    onDidReceiveNotificationResponse: (NotificationResponse response) async {
      debugPrint('Notification tapped: ${response.payload}');
    },
  );

  // ✅ Android 13+ permission request
  final androidPlugin = flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin
      >();

  await androidPlugin?.requestNotificationsPermission();

  // ✅ Create notification channel (REQUIRED for Android 8+)
  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    'credify_channel',
    'Credify Notifications',
    description: 'This channel is used for finance alerts.',
    importance: Importance.high,
  );

  await androidPlugin?.createNotificationChannel(channel);
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
