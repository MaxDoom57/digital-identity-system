import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../main.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();

  bool _loading      = false;
  bool _obscurePass  = true;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      await AuthService.login(_emailCtrl.text.trim(), _passCtrl.text);
      if (!mounted) return;
      // Proceed to biometric 2nd-factor screen
      Navigator.pushReplacementNamed(context, AppRoutes.biometricAuth);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Unable to connect to server. Check your network.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // ── Hero panel ────────────────────────────────────────────────
          Expanded(
            flex: 4,
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.navyDark, AppColors.navy],
                ),
              ),
              child: SafeArea(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.white.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: AppColors.teal.withOpacity(0.5),
                          width: 1.5,
                        ),
                      ),
                      child: const Icon(Icons.verified_user_outlined,
                          size: 40, color: AppColors.teal),
                    ),
                    const SizedBox(height: 20),
                    Text('SL Digital ID',
                        style: Theme.of(context)
                            .textTheme
                            .displaySmall
                            ?.copyWith(
                                color: AppColors.white,
                                fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text('Blockchain-Verified National Identity',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.white.withOpacity(0.55),
                              letterSpacing: 0.8,
                            )),
                    const SizedBox(height: 24),
                    Wrap(
                      spacing: 10,
                      children: const [
                        _FeatureChip(icon: Icons.link,         label: 'Blockchain'),
                        _FeatureChip(icon: Icons.face_outlined, label: 'Face ID'),
                        _FeatureChip(icon: Icons.wifi_off,      label: 'Offline'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Login panel ───────────────────────────────────────────────
          Expanded(
            flex: 6,
            child: Container(
              width: double.infinity,
              color: AppColors.white,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(28, 28, 28, 20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Sign In',
                          style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 4),
                      Text('Enter your registered email and password',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: AppColors.midGrey)),

                      const SizedBox(height: 24),

                      // Error banner
                      if (_error != null) ...[
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.error.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: AppColors.error.withOpacity(0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline,
                                  color: AppColors.error, size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(_error!,
                                    style: const TextStyle(
                                        color: AppColors.error,
                                        fontSize: 13,
                                        fontFamily: 'Outfit')),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Email field
                      TextFormField(
                        controller: _emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Email Address',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Email is required';
                          }
                          if (!v.contains('@')) return 'Enter a valid email';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Password field
                      TextFormField(
                        controller: _passCtrl,
                        obscureText: _obscurePass,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _login(),
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePass
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined),
                            onPressed: () =>
                                setState(() => _obscurePass = !_obscurePass),
                          ),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Password is required';
                          if (v.length < 6) return 'Password too short';
                          return null;
                        },
                      ),

                      const SizedBox(height: 28),

                      // Sign-in button
                      ElevatedButton(
                        onPressed: _loading ? null : _login,
                        style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.navy),
                        child: _loading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: AppColors.white))
                            : const Text('Sign In'),
                      ),

                      const SizedBox(height: 14),

                      // Register link
                      OutlinedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.person_add_outlined, size: 18),
                        label: const Text('Register New Identity'),
                      ),

                      const SizedBox(height: 16),
                      Center(
                        child: Text(
                          'Registration is done via the Citizen Web Portal',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: AppColors.midGrey, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeatureChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.white.withOpacity(0.15)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppColors.teal),
          const SizedBox(width: 5),
          Text(label,
              style: const TextStyle(
                  color: AppColors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  fontFamily: 'Outfit')),
        ],
      ),
    );
  }
}
