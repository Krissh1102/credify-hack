import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/screens/home_screen.dart';
import 'package:mobile/services/clerk_service.dart';
import 'package:mobile/theme/dark.dart';
import 'package:mobile/theme/theme.dart';

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════
class LoginScreen extends StatefulWidget {
  final VoidCallback? onForgotPassword;
  final VoidCallback? onSignUp;
  final void Function(String email, String password)? onLogin;

  const LoginScreen({
    super.key,
    this.onForgotPassword,
    this.onSignUp,
    this.onLogin,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ac;
  late List<Animation<double>> _itemFades;
  late List<Animation<Offset>> _itemSlides;

  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _emailFocus = FocusNode();
  final _passFocus = FocusNode();

  bool _obscurePass = true;
  bool _rememberMe = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _ac = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );

    // Stagger 5 items: header, email, password, remember row, buttons
    _itemFades = List.generate(5, (i) {
      final start = i * 0.1;
      final end = (start + 0.5).clamp(0.0, 1.0);
      return CurvedAnimation(
        parent: _ac,
        curve: Interval(start, end, curve: Curves.easeOut),
      );
    });

    _itemSlides = List.generate(5, (i) {
      final start = i * 0.1;
      final end = (start + 0.55).clamp(0.0, 1.0);
      return Tween<Offset>(
        begin: const Offset(0, 0.06),
        end: Offset.zero,
      ).animate(
        CurvedAnimation(
          parent: _ac,
          curve: Interval(start, end, curve: Curves.easeOutCubic),
        ),
      );
    });

    _ac.forward();
  }

  @override
  void dispose() {
    _ac.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _emailFocus.dispose();
    _passFocus.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (_isLoading) return;
    final email = _emailCtrl.text.trim();
    final password = _passCtrl.text;

    if (email.isEmpty || password.isEmpty) {
      _showError('Please enter your email and password.');
      return;
    }

    HapticFeedback.lightImpact();
    setState(() => _isLoading = true);

    final error = await ClerkAuthService.signIn(email, password);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (error != null) {
      _showError(error);
    } else {
      widget.onLogin?.call(email, password);
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const HomeScreen()),
      );
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.redAccent,
        behavior: SnackBarBehavior.floating,
        margin: EdgeInsets.all(R.p(16)),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(R.r(12)),
        ),
      ),
    );
  }

  Widget _staggered(int i, Widget child) {
    return FadeTransition(
      opacity: _itemFades[i],
      child: SlideTransition(position: _itemSlides[i], child: child),
    );
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
        resizeToAvoidBottomInset: true,
        body: SafeArea(
          child: Stack(
            children: [
              // Background blobs
              Positioned(
                top: -R.h(10),
                right: -R.w(20),
                child: Container(
                  width: R.w(60),
                  height: R.w(60),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [T.accent.withOpacity(0.1), Colors.transparent],
                    ),
                  ),
                ),
              ),

              // Scrollable content
              GestureDetector(
                onTap: () => FocusScope.of(context).unfocus(),
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: EdgeInsets.fromLTRB(R.p(24), 0, R.p(24), R.p(32)),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: R.h(100) - MediaQuery.of(context).padding.top,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(height: R.h(2.5)),

                        // Back button
                        _staggered(0, _BackButton()),

                        SizedBox(height: R.h(3)),

                        // Header
                        _staggered(0, _LoginHeader()),

                        SizedBox(height: R.h(4.5)),

                        // Email field
                        _staggered(1, _InputLabel('Email Address')),
                        SizedBox(height: R.p(8)),
                        _staggered(
                          1,
                          _AppTextField(
                            controller: _emailCtrl,
                            focusNode: _emailFocus,
                            hint: 'you@example.com',
                            icon: Icons.mail_outline_rounded,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            onSubmitted: (_) => _passFocus.requestFocus(),
                          ),
                        ),

                        SizedBox(height: R.p(20)),

                        // Password field
                        _staggered(2, _InputLabel('Password')),
                        SizedBox(height: R.p(8)),
                        _staggered(
                          2,
                          _AppTextField(
                            controller: _passCtrl,
                            focusNode: _passFocus,
                            hint: '••••••••',
                            icon: Icons.lock_outline_rounded,
                            obscureText: _obscurePass,
                            textInputAction: TextInputAction.done,
                            onSubmitted: (_) => _handleLogin(),
                            suffix: GestureDetector(
                              onTap: () =>
                                  setState(() => _obscurePass = !_obscurePass),
                              child: Icon(
                                _obscurePass
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                                color: T.textSecondary,
                                size: R.fs(18),
                              ),
                            ),
                          ),
                        ),

                        SizedBox(height: R.p(16)),

                        // Remember me + Forgot password
                        _staggered(
                          3,
                          Row(
                            children: [
                              _RememberToggle(
                                value: _rememberMe,
                                onChanged: (v) =>
                                    setState(() => _rememberMe = v),
                              ),
                              const Spacer(),
                              GestureDetector(
                                onTap: widget.onForgotPassword,
                                child: Text(
                                  'Forgot Password?',
                                  style: TextStyle(
                                    color: T.accent,
                                    fontSize: R.fs(13),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        SizedBox(height: R.h(4)),

                        // Login button
                        _staggered(
                          4,
                          _LoginButton(
                            isLoading: _isLoading,
                            onTap: _handleLogin,
                          ),
                        ),

                        SizedBox(height: R.p(24)),

                        // Divider
                        _staggered(4, _OrDivider()),

                        SizedBox(height: R.p(20)),

                        // Social login
                        _staggered(
                          4,
                          SizedBox(
                            width: double.infinity,
                            height: R.p(22).clamp(48.0, 56.0),
                            child: ElevatedButton(
                              onPressed: () {},
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: T.textPrimary,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(R.r(16)),
                                  side: BorderSide(color: T.border),
                                ),
                                alignment: Alignment.centerLeft,
                                padding: EdgeInsets.symmetric(
                                  horizontal: R.p(18),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.start,
                                children: [
                                  Icon(Icons.g_mobiledata, color: Colors.black),
                                  SizedBox(width: R.p(16)),
                                  Text(
                                    'Continue with Google',
                                    style: TextStyle(
                                      color: Colors.black,

                                      fontSize: R.fs(14).clamp(13.0, 16.0),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        SizedBox(height: R.p(32)),

                        // Sign up redirect
                        _staggered(4, _SignUpRedirect(onTap: widget.onSignUp)),
                      ],
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

// ─── Back Button ─────────────────────────────────────────────────
class _BackButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final s = R.p(40).clamp(36.0, 46.0);
    return Material(
      color: T.elevated,
      borderRadius: BorderRadius.circular(R.r(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.r(12)),
        onTap: () => Navigator.maybePop(context),
        child: Container(
          width: s,
          height: s,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(R.r(12)),
            border: Border.all(color: T.border, width: 1),
          ),
          child: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: T.textSecondary,
            size: R.fs(16),
          ),
        ),
      ),
    );
  }
}

// ─── Header ──────────────────────────────────────────────────────
class _LoginHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: R.p(48).clamp(42.0, 56.0),
          height: R.p(48).clamp(42.0, 56.0),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [T.accent, T.accentSoft],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(R.r(16)),
            boxShadow: [
              BoxShadow(
                color: T.accent.withOpacity(0.36),
                blurRadius: 20,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Center(
            child: Text(
              '₹',
              style: TextStyle(
                color: Colors.white,
                fontSize: R.fs(24),
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),
        SizedBox(height: R.p(20)),
        Text(
          'Welcome back',
          style: TextStyle(
            color: T.textSecondary,
            fontSize: R.fs(14),
            fontWeight: FontWeight.w500,
            letterSpacing: 0.2,
          ),
        ),
        SizedBox(height: R.p(4)),
        Text(
          'Sign in to your\naccount',
          style: TextStyle(
            color: T.textPrimary,
            fontSize: R.fs(32),
            fontWeight: FontWeight.w800,
            letterSpacing: -1.2,
            height: 1.15,
          ),
        ),
      ],
    );
  }
}

// ─── Input Label ─────────────────────────────────────────────────
class _InputLabel extends StatelessWidget {
  final String text;
  const _InputLabel(this.text);
  @override
  Widget build(BuildContext context) => Text(
    text,
    style: TextStyle(
      color: T.textSecondary,
      fontSize: R.fs(12),
      fontWeight: FontWeight.w600,
      letterSpacing: 0.4,
    ),
  );
}

// ─── App Text Field ──────────────────────────────────────────────
class _AppTextField extends StatefulWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final String hint;
  final IconData icon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final Widget? suffix;

  const _AppTextField({
    required this.controller,
    required this.focusNode,
    required this.hint,
    required this.icon,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.onSubmitted,
    this.suffix,
  });

  @override
  State<_AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<_AppTextField> {
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    widget.focusNode.addListener(_onFocusChange);
  }

  void _onFocusChange() =>
      setState(() => _isFocused = widget.focusNode.hasFocus);

  @override
  void dispose() {
    widget.focusNode.removeListener(_onFocusChange);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: T.surface,
        borderRadius: BorderRadius.circular(R.r(16)),
        border: Border.all(
          color: _isFocused ? T.accent.withOpacity(0.7) : T.border,
          width: _isFocused ? 1.5 : 1,
        ),
        boxShadow: _isFocused
            ? [
                BoxShadow(
                  color: T.accent.withOpacity(0.12),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ]
            : [
                BoxShadow(
                  color: T.border.withOpacity(0.4),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: TextField(
        controller: widget.controller,
        focusNode: widget.focusNode,
        obscureText: widget.obscureText,
        keyboardType: widget.keyboardType,
        textInputAction: widget.textInputAction,
        onSubmitted: widget.onSubmitted,
        style: TextStyle(
          color: T.textPrimary,
          fontSize: R.fs(15),
          fontWeight: FontWeight.w500,
          letterSpacing: widget.obscureText ? 2 : 0,
        ),
        decoration: InputDecoration(
          hintText: widget.hint,
          hintStyle: TextStyle(color: T.textMuted, fontSize: R.fs(14)),
          prefixIcon: Padding(
            padding: EdgeInsets.only(left: R.p(14), right: R.p(10)),
            child: Icon(
              widget.icon,
              color: _isFocused ? T.accent : T.textSecondary,
              size: R.fs(18),
            ),
          ),
          prefixIconConstraints: const BoxConstraints(),
          suffixIcon: widget.suffix != null
              ? Padding(
                  padding: EdgeInsets.only(right: R.p(14)),
                  child: widget.suffix,
                )
              : null,
          suffixIconConstraints: const BoxConstraints(),
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(
            horizontal: R.p(16),
            vertical: R.p(17),
          ),
        ),
      ),
    );
  }
}

// ─── Remember Me Toggle ──────────────────────────────────────────
class _RememberToggle extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;
  const _RememberToggle({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: R.p(20),
            height: R.p(20),
            decoration: BoxDecoration(
              color: value ? T.accent : Colors.transparent,
              borderRadius: BorderRadius.circular(R.r(6)),
              border: Border.all(
                color: value ? T.accent : T.border,
                width: 1.5,
              ),
              boxShadow: value
                  ? [BoxShadow(color: T.accent.withOpacity(0.3), blurRadius: 8)]
                  : null,
            ),
            child: value
                ? Icon(Icons.check_rounded, color: Colors.white, size: R.fs(13))
                : null,
          ),
          SizedBox(width: R.p(8)),
          Text(
            'Remember me',
            style: TextStyle(
              color: T.textSecondary,
              fontSize: R.fs(13),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Login Button ─────────────────────────────────────────────────
class _LoginButton extends StatelessWidget {
  final bool isLoading;
  final VoidCallback onTap;
  const _LoginButton({required this.isLoading, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final btnH = R.p(56).clamp(50.0, 64.0);
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(R.r(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(R.r(16)),
        onTap: isLoading ? null : onTap,
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
                color: T.accent.withOpacity(0.4),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            child: isLoading
                ? const Center(
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Sign In',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: R.fs(16),
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                        ),
                      ),
                      SizedBox(width: R.p(8)),
                      const Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 18,
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

// ─── Or Divider ──────────────────────────────────────────────────
class _OrDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Divider(color: T.border, height: 1)),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: R.p(14)),
          child: Text(
            'or continue with',
            style: TextStyle(color: T.textMuted, fontSize: R.fs(12)),
          ),
        ),
        Expanded(child: Divider(color: T.border, height: 1)),
      ],
    );
  }
}

// ─── Sign Up Redirect ─────────────────────────────────────────────
class _SignUpRedirect extends StatelessWidget {
  final VoidCallback? onTap;
  const _SignUpRedirect({this.onTap});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            "Don't have an account? ",
            style: TextStyle(color: T.textSecondary, fontSize: R.fs(14)),
          ),
          GestureDetector(
            onTap: onTap,
            child: Text(
              'Sign Up',
              style: TextStyle(
                color: T.accent,
                fontSize: R.fs(14),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
