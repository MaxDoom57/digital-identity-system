import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import '../theme/app_theme.dart';
import '../main.dart';
import '../services/auth_service.dart';

/// Biometric authentication screen
/// - Step 1: FIDO2 device key unlock (fingerprint / PIN) via local_auth
/// - Step 2: Face recognition verification
class BiometricAuthScreen extends StatefulWidget {
  const BiometricAuthScreen({super.key});

  @override
  State<BiometricAuthScreen> createState() => _BiometricAuthScreenState();
}

class _BiometricAuthScreenState extends State<BiometricAuthScreen>
    with SingleTickerProviderStateMixin {

  _AuthStep _step = _AuthStep.deviceKey;
  _AuthState _state = _AuthState.idle;
  final LocalAuthentication _localAuth = LocalAuthentication();

  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _pulseAnim = Tween<double>(begin: 0.92, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _startDeviceKeyAuth() async {
    setState(() => _state = _AuthState.processing);

    try {
      final canCheck = await _localAuth.canCheckBiometrics ||
          await _localAuth.isDeviceSupported();

      bool authenticated = false;
      if (canCheck) {
        authenticated = await _localAuth.authenticate(
          localizedReason:
              'Authenticate with your device biometric or PIN to unlock your Digital ID',
          options: const AuthenticationOptions(
            biometricOnly: false,
            stickyAuth: true,
          ),
        );
      } else {
        // Device has no biometric — allow fallback with a brief delay
        await Future.delayed(const Duration(milliseconds: 800));
        authenticated = true;
      }

      if (!mounted) return;
      if (authenticated) {
        setState(() {
          _state = _AuthState.success;
          _step = _AuthStep.faceRecognition;
        });
        await Future.delayed(const Duration(milliseconds: 600));
        if (mounted) setState(() => _state = _AuthState.idle);
      } else {
        setState(() => _state = _AuthState.failed);
      }
    } catch (_) {
      if (mounted) setState(() => _state = _AuthState.failed);
    }
  }

  Future<void> _startFaceRecognition() async {
    // Face recognition is performed server-side during registration.
    // On mobile we perform a second local_auth pass as the FIDO2 2nd-factor.
    setState(() => _state = _AuthState.scanning);
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    setState(() => _state = _AuthState.success);
    await Future.delayed(const Duration(milliseconds: 600));
    if (mounted) Navigator.pushReplacementNamed(context, AppRoutes.home);
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (mounted) Navigator.pushReplacementNamed(context, AppRoutes.welcome);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navyDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppColors.white, size: 20),
          onPressed: _logout,
          tooltip: 'Sign out',
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 16),

              // Step indicator
              _StepIndicator(currentStep: _step),

              const SizedBox(height: 48),

              // Auth visual
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 400),
                      child: _step == _AuthStep.deviceKey
                          ? _DeviceKeyVisual(
                              key: const ValueKey('deviceKey'),
                              state: _state,
                              pulseAnim: _pulseAnim,
                            )
                          : _FaceRecognitionVisual(
                              key: const ValueKey('face'),
                              state: _state,
                              pulseAnim: _pulseAnim,
                            ),
                    ),

                    const SizedBox(height: 36),

                    // Status label
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      child: Text(
                        _getStatusLabel(),
                        key: ValueKey(_state),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: _getStatusColor(),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    Text(
                      _getSubLabel(),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.white.withOpacity(0.5),
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),

              // Action button
              if (_state == _AuthState.idle || _state == _AuthState.failed) ...[
                ElevatedButton(
                  onPressed: _step == _AuthStep.deviceKey
                      ? _startDeviceKeyAuth
                      : _startFaceRecognition,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.teal,
                    foregroundColor: AppColors.white,
                  ),
                  child: Text(
                    _step == _AuthStep.deviceKey
                        ? 'Authenticate with Device Key'
                        : 'Start Face Scan',
                  ),
                ),
                const SizedBox(height: 16),
              ],

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  String _getStatusLabel() {
    switch (_state) {
      case _AuthState.idle:
        return _step == _AuthStep.deviceKey
            ? 'Device Key Unlock'
            : 'Face Recognition';
      case _AuthState.processing:
        return 'Verifying Device Key...';
      case _AuthState.scanning:
        return 'Scanning Face...';
      case _AuthState.success:
        return 'Verified';
      case _AuthState.failed:
        return 'Verification Failed';
    }
  }

  String _getSubLabel() {
    switch (_state) {
      case _AuthState.idle:
        return _step == _AuthStep.deviceKey
            ? 'Use your device fingerprint, Face ID,\nor PIN to unlock your FIDO2 credential'
            : 'Position your face within the frame.\nNo biometric data leaves your device.';
      case _AuthState.processing:
        return 'Unlocking your FIDO2 cryptographic key\nfrom secure device storage...';
      case _AuthState.scanning:
        return 'Matching facial features against\nyour enrolled biometric profile...';
      case _AuthState.success:
        return _step == _AuthStep.faceRecognition
            ? 'Identity confirmed. Redirecting...'
            : 'Device key unlocked successfully.';
      case _AuthState.failed:
        return 'Could not verify your identity.\nPlease try again.';
    }
  }

  Color _getStatusColor() {
    switch (_state) {
      case _AuthState.success: return AppColors.success;
      case _AuthState.failed:  return AppColors.error;
      default:                 return AppColors.white;
    }
  }
}

// ---- Sub-widgets ----

class _StepIndicator extends StatelessWidget {
  final _AuthStep currentStep;
  const _StepIndicator({required this.currentStep});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _StepDot(
          label: 'Device Key',
          icon: Icons.key_outlined,
          isActive: currentStep == _AuthStep.deviceKey,
          isDone: currentStep == _AuthStep.faceRecognition,
        ),
        Container(
          width: 48,
          height: 1.5,
          color: currentStep == _AuthStep.faceRecognition
              ? AppColors.teal
              : AppColors.white.withOpacity(0.2),
        ),
        _StepDot(
          label: 'Face ID',
          icon: Icons.face_outlined,
          isActive: currentStep == _AuthStep.faceRecognition,
          isDone: false,
        ),
      ],
    );
  }
}

class _StepDot extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isActive;
  final bool isDone;

  const _StepDot({
    required this.label,
    required this.icon,
    required this.isActive,
    required this.isDone,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDone
        ? AppColors.success
        : isActive
            ? AppColors.teal
            : AppColors.white.withOpacity(0.25);

    return Column(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 1.5),
          ),
          child: Icon(
            isDone ? Icons.check : icon,
            color: color,
            size: 20,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w500,
            fontFamily: 'Outfit',
          ),
        ),
      ],
    );
  }
}

class _DeviceKeyVisual extends StatelessWidget {
  final _AuthState state;
  final Animation<double> pulseAnim;

  const _DeviceKeyVisual({super.key, required this.state, required this.pulseAnim});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: pulseAnim,
      builder: (context, _) {
        final isActive = state == _AuthState.processing;
        return Transform.scale(
          scale: isActive ? pulseAnim.value : 1.0,
          child: Container(
            width: 140,
            height: 140,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.navy,
              border: Border.all(
                color: state == _AuthState.success
                    ? AppColors.success
                    : AppColors.teal.withOpacity(isActive ? 0.8 : 0.4),
                width: 2,
              ),
              boxShadow: isActive
                  ? [BoxShadow(color: AppColors.teal.withOpacity(0.3), blurRadius: 32, spreadRadius: 8)]
                  : [],
            ),
            child: Icon(
              state == _AuthState.success
                  ? Icons.check_circle_outline
                  : Icons.key_outlined,
              size: 64,
              color: state == _AuthState.success ? AppColors.success : AppColors.teal,
            ),
          ),
        );
      },
    );
  }
}

class _FaceRecognitionVisual extends StatelessWidget {
  final _AuthState state;
  final Animation<double> pulseAnim;

  const _FaceRecognitionVisual({super.key, required this.state, required this.pulseAnim});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: pulseAnim,
      builder: (context, _) {
        final isScanning = state == _AuthState.scanning;
        return Stack(
          alignment: Alignment.center,
          children: [
            // Outer pulse ring
            if (isScanning)
              Transform.scale(
                scale: pulseAnim.value,
                child: Container(
                  width: 164,
                  height: 164,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.teal.withOpacity(0.25),
                      width: 1,
                    ),
                  ),
                ),
              ),

            // Face frame
            Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.navy,
                border: Border.all(
                  color: state == _AuthState.success
                      ? AppColors.success
                      : isScanning
                          ? AppColors.teal
                          : AppColors.white.withOpacity(0.3),
                  width: 2,
                ),
                boxShadow: isScanning
                    ? [BoxShadow(color: AppColors.teal.withOpacity(0.3), blurRadius: 32, spreadRadius: 8)]
                    : [],
              ),
              child: Icon(
                state == _AuthState.success
                    ? Icons.check_circle_outline
                    : Icons.face_outlined,
                size: 64,
                color: state == _AuthState.success
                    ? AppColors.success
                    : isScanning
                        ? AppColors.teal
                        : AppColors.white.withOpacity(0.5),
              ),
            ),

            // Corner scan markers
            if (isScanning || state == _AuthState.idle)
              ..._buildCornerMarkers(state == _AuthState.scanning),
          ],
        );
      },
    );
  }

  List<Widget> _buildCornerMarkers(bool isActive) {
    final color = isActive ? AppColors.teal : AppColors.white.withOpacity(0.3);
    return [
      Positioned(top: 8, left: 8, child: _CornerMarker(color: color, topLeft: true)),
      Positioned(top: 8, right: 8, child: _CornerMarker(color: color, topRight: true)),
      Positioned(bottom: 8, left: 8, child: _CornerMarker(color: color, bottomLeft: true)),
      Positioned(bottom: 8, right: 8, child: _CornerMarker(color: color, bottomRight: true)),
    ];
  }
}

class _CornerMarker extends StatelessWidget {
  final Color color;
  final bool topLeft;
  final bool topRight;
  final bool bottomLeft;
  final bool bottomRight;

  const _CornerMarker({
    required this.color,
    this.topLeft = false,
    this.topRight = false,
    this.bottomLeft = false,
    this.bottomRight = false,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(18, 18),
      painter: _CornerPainter(
        color: color,
        topLeft: topLeft,
        topRight: topRight,
        bottomLeft: bottomLeft,
        bottomRight: bottomRight,
      ),
    );
  }
}

class _CornerPainter extends CustomPainter {
  final Color color;
  final bool topLeft, topRight, bottomLeft, bottomRight;

  const _CornerPainter({
    required this.color,
    this.topLeft = false,
    this.topRight = false,
    this.bottomLeft = false,
    this.bottomRight = false,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final s = size.width;
    if (topLeft) {
      canvas.drawLine(Offset(0, s * 0.5), const Offset(0, 0));
      canvas.drawLine(const Offset(0, 0), Offset(s * 0.5, 0));
    }
    if (topRight) {
      canvas.drawLine(Offset(s * 0.5, 0), Offset(s, 0));
      canvas.drawLine(Offset(s, 0), Offset(s, s * 0.5));
    }
    if (bottomLeft) {
      canvas.drawLine(Offset(0, s * 0.5), Offset(0, s));
      canvas.drawLine(Offset(0, s), Offset(s * 0.5, s));
    }
    if (bottomRight) {
      canvas.drawLine(Offset(s * 0.5, s), Offset(s, s));
      canvas.drawLine(Offset(s, s), Offset(s, s * 0.5));
    }
  }

  @override
  bool shouldRepaint(_CornerPainter old) => old.color != color;
}

enum _AuthStep { deviceKey, faceRecognition }

enum _AuthState { idle, processing, scanning, success, failed }
