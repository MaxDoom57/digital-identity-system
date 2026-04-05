import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

class QrTokenScreen extends StatefulWidget {
  const QrTokenScreen({super.key});

  @override
  State<QrTokenScreen> createState() => _QrTokenScreenState();
}

class _QrTokenScreenState extends State<QrTokenScreen> {
  _TokenState _tokenState = _TokenState.idle;
  Timer? _countdownTimer;
  int _remainingSeconds = 0;
  int _totalSeconds = 86400;

  // Real token data from backend
  String? _qrBase64;     // base64 portion of data:image/png;base64,<data>
  String? _errorMsg;

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _generateToken() async {
    setState(() {
      _tokenState = _TokenState.generating;
      _errorMsg = null;
    });

    try {
      final data = await ApiService.post('/api/citizen/offline-token');

      final qrDataUrl = data['qrCode'] as String? ?? '';
      final expiry    = data['expiry'];    // Unix timestamp (seconds)
      final validFor  = data['validFor'];  // duration in seconds (fallback)

      // Decode base64 from data URL
      String? base64Str;
      if (qrDataUrl.contains(',')) {
        base64Str = qrDataUrl.split(',').last;
      }

      // Calculate remaining seconds
      int remaining = 86400;
      if (expiry != null) {
        final expiryTs = (expiry as num).toInt();
        final nowTs = DateTime.now().millisecondsSinceEpoch ~/ 1000;
        remaining = (expiryTs - nowTs).clamp(0, 864000);
      } else if (validFor != null) {
        remaining = (validFor as num).toInt();
      }

      if (!mounted) return;
      setState(() {
        _qrBase64 = base64Str;
        _remainingSeconds = remaining;
        _totalSeconds = remaining > 0 ? remaining : 86400;
        _tokenState = _TokenState.active;
      });
      _startCountdown();
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _tokenState = _TokenState.idle;
          _errorMsg = e.message;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _tokenState = _TokenState.idle;
          _errorMsg = 'Failed to generate token. Check network.';
        });
      }
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() {
        if (_remainingSeconds > 0) {
          _remainingSeconds--;
        } else {
          _tokenState = _TokenState.expired;
          _qrBase64 = null;
          timer.cancel();
        }
      });
    });
  }

  String get _formattedCountdown {
    final h = _remainingSeconds ~/ 3600;
    final m = (_remainingSeconds % 3600) ~/ 60;
    final s = _remainingSeconds % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  double get _progressValue =>
      _totalSeconds > 0 ? _remainingSeconds / _totalSeconds : 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.offWhite,
      appBar: AppBar(
        title: const Text('Offline QR Token'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: _showInfoDialog,
            tooltip: 'How it works',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Info banner
            _InfoBanner(),

            const SizedBox(height: 24),

            // Error banner
            if (_errorMsg != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.error.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMsg!,
                        style: const TextStyle(
                          color: AppColors.error,
                          fontSize: 13,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // QR panel
            _buildQrPanel(context),

            const SizedBox(height: 24),

            // Fields included
            _buildFieldsCard(context),

            const SizedBox(height: 24),

            // Security note
            _buildSecurityNote(context),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildQrPanel(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Status header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Proof Token', style: Theme.of(context).textTheme.headlineSmall),
                    Text('ECDSA-P256 Signed', style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
                _StatusBadge(state: _tokenState),
              ],
            ),

            const SizedBox(height: 24),

            // QR / placeholder area
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              child: _buildQrContent(context),
            ),

            const SizedBox(height: 24),

            // Countdown or generate button
            if (_tokenState == _TokenState.active) ...[
              // Progress bar
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: _progressValue,
                  backgroundColor: AppColors.lightGrey,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    _progressValue > 0.1 ? AppColors.teal : AppColors.error,
                  ),
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.schedule_outlined, size: 14, color: AppColors.midGrey),
                      const SizedBox(width: 4),
                      Text(
                        'Expires in $_formattedCountdown',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: _progressValue > 0.1 ? AppColors.darkGrey : AppColors.error,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  TextButton.icon(
                    onPressed: _generateToken,
                    icon: const Icon(Icons.refresh, size: 15),
                    label: const Text('Regenerate', style: TextStyle(fontSize: 12)),
                    style: TextButton.styleFrom(foregroundColor: AppColors.teal),
                  ),
                ],
              ),
            ] else if (_tokenState == _TokenState.idle || _tokenState == _TokenState.expired) ...[
              ElevatedButton.icon(
                onPressed: _generateToken,
                icon: const Icon(Icons.qr_code_2_outlined, size: 20),
                label: Text(_tokenState == _TokenState.expired
                    ? 'Generate New Token'
                    : 'Generate QR Token'),
              ),
            ] else if (_tokenState == _TokenState.generating) ...[
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.teal,
                      ),
                    ),
                    SizedBox(width: 10),
                    Text(
                      'Signing with ECDSA-P256...',
                      style: TextStyle(
                        color: AppColors.midGrey,
                        fontSize: 13,
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildQrContent(BuildContext context) {
    if (_tokenState == _TokenState.active && _qrBase64 != null) {
      return Column(
        key: const ValueKey('qr'),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.lightGrey),
            ),
            child: Image.memory(
              base64Decode(_qrBase64!),
              width: 220,
              height: 220,
              fit: BoxFit.contain,
            ),
          ),
        ],
      );
    }

    if (_tokenState == _TokenState.generating) {
      return Container(
        key: const ValueKey('loading'),
        width: 244,
        height: 244,
        decoration: BoxDecoration(
          color: AppColors.lightGrey.withOpacity(0.3),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.lightGrey),
        ),
        child: const Icon(Icons.qr_code_2_outlined, size: 64, color: AppColors.lightGrey),
      );
    }

    if (_tokenState == _TokenState.expired) {
      return Container(
        key: const ValueKey('expired'),
        width: 244,
        height: 244,
        decoration: BoxDecoration(
          color: AppColors.error.withOpacity(0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.error.withOpacity(0.2)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.timer_off_outlined, size: 48, color: AppColors.error),
            const SizedBox(height: 10),
            Text(
              'Token Expired',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.error),
            ),
            Text(
              'Generate a new token to continue',
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    // Idle state
    return Container(
      key: const ValueKey('idle'),
      width: 244,
      height: 244,
      decoration: BoxDecoration(
        color: AppColors.offWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.lightGrey, style: BorderStyle.solid),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.qr_code_2_outlined, size: 56, color: AppColors.lightGrey),
          const SizedBox(height: 12),
          Text(
            'No active token',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.midGrey),
          ),
        ],
      ),
    );
  }

  Widget _buildFieldsCard(BuildContext context) {
    final fields = ['Full Name', 'NIC Number', 'Date of Birth', 'Gender'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.list_alt_outlined, color: AppColors.teal, size: 18),
                const SizedBox(width: 8),
                Text('Included in Token', style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
            const Divider(height: 18),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: fields.map((f) => _FieldTag(label: f)).toList(),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.lock_outline, size: 13, color: AppColors.midGrey),
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    'Private fields (address, email, phone) are never included in offline tokens.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.midGrey,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecurityNote(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.navy.withOpacity(0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.navy.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.shield_outlined, color: AppColors.navy, size: 18),
              const SizedBox(width: 8),
              Text('Security Information', style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 12),
          _SecurityRow(icon: Icons.timer_outlined, text: 'Token is valid for 24 hours only'),
          _SecurityRow(icon: Icons.replay_outlined, text: 'Single-use nonce prevents replay attacks'),
          _SecurityRow(icon: Icons.key_outlined, text: 'Signed with your ECDSA-P256 private key'),
          _SecurityRow(icon: Icons.wifi_off_outlined, text: 'Works without internet connection'),
        ],
      ),
    );
  }

  void _showInfoDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('How Offline QR Token Works'),
        content: const Text(
          'The offline QR token is a cryptographically signed proof of your identity.\n\n'
          '1. Your identity fields are encoded into a JWT-like payload.\n'
          '2. The payload is signed using your ECDSA-P256 private key stored securely on-device.\n'
          '3. A unique nonce is embedded to prevent replay attacks.\n'
          '4. The token is valid for 24 hours.\n'
          '5. Service providers scan the QR code and verify the signature offline — no internet needed.',
          style: TextStyle(height: 1.6, fontFamily: 'Outfit'),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}

// ---- Sub-widgets ----

class _InfoBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.goldLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.gold.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.wifi_off_outlined, color: AppColors.gold, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'This QR token works without internet. Present it to a service provider for offline identity verification.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.gold,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final _TokenState state;
  const _StatusBadge({required this.state});

  @override
  Widget build(BuildContext context) {
    late Color color;
    late String label;
    late IconData icon;

    switch (state) {
      case _TokenState.idle:
        color = AppColors.midGrey; label = 'No Token'; icon = Icons.radio_button_unchecked;
        break;
      case _TokenState.generating:
        color = AppColors.warning; label = 'Signing...'; icon = Icons.pending_outlined;
        break;
      case _TokenState.active:
        color = AppColors.success; label = 'Active'; icon = Icons.check_circle_outline;
        break;
      case _TokenState.expired:
        color = AppColors.error; label = 'Expired'; icon = Icons.cancel_outlined;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 13),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              fontFamily: 'Outfit',
            ),
          ),
        ],
      ),
    );
  }
}

class _FieldTag extends StatelessWidget {
  final String label;
  const _FieldTag({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.tealLight,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check, size: 12, color: AppColors.teal),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.teal,
              fontSize: 11,
              fontWeight: FontWeight.w500,
              fontFamily: 'Outfit',
            ),
          ),
        ],
      ),
    );
  }
}

class _SecurityRow extends StatelessWidget {
  final IconData icon;
  final String text;

  const _SecurityRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppColors.navy.withOpacity(0.6)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.darkGrey,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum _TokenState { idle, generating, active, expired }
