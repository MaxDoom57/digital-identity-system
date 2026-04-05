import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../models/citizen.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class DigitalIdScreen extends StatefulWidget {
  const DigitalIdScreen({super.key});

  @override
  State<DigitalIdScreen> createState() => _DigitalIdScreenState();
}

class _DigitalIdScreenState extends State<DigitalIdScreen> {
  Citizen? _citizen;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final data = await ApiService.get('/api/citizen/profile');
      final citizenJson = data['citizen'] as Map<String, dynamic>;
      await AuthService.updateCachedCitizen(citizenJson);
      if (mounted) setState(() => _citizen = Citizen.fromJson(citizenJson));
    } catch (_) {
      final cached = await AuthService.getCachedCitizen();
      if (cached != null && mounted) {
        setState(() => _citizen = Citizen.fromJson(cached));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.offWhite,
        body: Center(child: CircularProgressIndicator(color: AppColors.teal)),
      );
    }

    final citizen = _citizen ?? Citizen.demo();

    return Scaffold(
      backgroundColor: AppColors.offWhite,
      appBar: AppBar(
        title: const Text('Digital Identity Card'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {},
            tooltip: 'Share',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // ID Card
            _DigitalIdCard(citizen: citizen),

            const SizedBox(height: 24),

            // Identity details
            _SectionCard(
              title: 'Personal Information',
              icon: Icons.person_outlined,
              children: [
                _DetailRow(label: 'Full Name',     value: citizen.fullName),
                _DetailRow(label: 'NIC Number',    value: citizen.nicNumber),
                _DetailRow(label: 'Date of Birth', value: citizen.dateOfBirth),
                _DetailRow(label: 'Gender',        value: citizen.gender),
                _DetailRow(label: 'Address',       value: citizen.address),
              ],
            ),

            const SizedBox(height: 16),

            // Contact details
            _SectionCard(
              title: 'Contact Information',
              icon: Icons.contact_phone_outlined,
              children: [
                _DetailRow(label: 'Email',        value: citizen.email),
                _DetailRow(label: 'Phone Number', value: citizen.phoneNumber),
              ],
            ),

            const SizedBox(height: 16),

            // Blockchain record
            _SectionCard(
              title: 'Blockchain Record',
              icon: Icons.link,
              children: [
                _DetailRow(
                  label: 'DID',
                  value: citizen.did.isEmpty ? 'Pending' : citizen.did,
                  copyable: citizen.did.isNotEmpty,
                ),
                _DetailRow(
                  label: 'Transaction ID',
                  value: citizen.blockchainTxId.isEmpty ? '—' : citizen.blockchainTxId,
                  copyable: citizen.blockchainTxId.isNotEmpty,
                ),
                _DetailRow(label: 'Enrolled On', value: citizen.enrollmentDate.isEmpty ? '—' : citizen.enrollmentDate),
                _DetailRow(
                  label: 'Network',
                  value: 'Hyperledger Fabric 2.5',
                  valueColor: AppColors.teal,
                ),
              ],
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

/// The visual ID card widget
class _DigitalIdCard extends StatelessWidget {
  final Citizen citizen;
  const _DigitalIdCard({required this.citizen});

  @override
  Widget build(BuildContext context) {
    final statusColor = citizen.status == IdentityStatus.verified
        ? AppColors.success
        : citizen.status == IdentityStatus.suspended
            ? AppColors.gold
            : citizen.status == IdentityStatus.revoked
                ? AppColors.error
                : AppColors.midGrey;

    return Container(
      width: double.infinity,
      height: 210,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.navyDark, AppColors.navy, Color(0xFF1A4A7A)],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withOpacity(0.35),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background pattern — subtle circles
          Positioned(
            top: -40,
            right: -40,
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.white.withOpacity(0.05),
                  width: 40,
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -30,
            left: -30,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.teal.withOpacity(0.08),
                  width: 30,
                ),
              ),
            ),
          ),

          // Card content
          Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row
                Row(
                  children: [
                    const Icon(Icons.verified_user_outlined, color: AppColors.teal, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA',
                      style: TextStyle(
                        color: AppColors.white.withOpacity(0.6),
                        fontSize: 8.5,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.8,
                        fontFamily: 'Outfit',
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        citizen.status.label.toUpperCase(),
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 8,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.0,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Main identity info
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Photo placeholder
                    Container(
                      width: 68,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: AppColors.white.withOpacity(0.15),
                        ),
                      ),
                      child: const Icon(
                        Icons.person_outlined,
                        color: AppColors.white,
                        size: 36,
                      ),
                    ),

                    const SizedBox(width: 16),

                    // Details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'DIGITAL IDENTITY CARD',
                            style: TextStyle(
                              color: AppColors.teal,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.2,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            citizen.fullName,
                            style: const TextStyle(
                              color: AppColors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          const SizedBox(height: 6),
                          _CardDetailRow(label: 'NIC', value: citizen.nicNumber),
                          const SizedBox(height: 3),
                          _CardDetailRow(label: 'DOB', value: citizen.dateOfBirth),
                          const SizedBox(height: 3),
                          _CardDetailRow(label: 'Gender', value: citizen.gender),
                        ],
                      ),
                    ),
                  ],
                ),

                const Spacer(),

                // Footer
                Row(
                  children: [
                    Icon(Icons.link, color: AppColors.teal.withOpacity(0.7), size: 12),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        citizen.did.isEmpty ? 'DID pending...' : citizen.did,
                        style: TextStyle(
                          color: AppColors.white.withOpacity(0.4),
                          fontSize: 9,
                          fontFamily: 'Outfit',
                          letterSpacing: 0.3,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Icon(Icons.shield_outlined, color: AppColors.teal.withOpacity(0.7), size: 12),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CardDetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _CardDetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 48,
          child: Text(
            label,
            style: TextStyle(
              color: AppColors.white.withOpacity(0.45),
              fontSize: 10,
              fontFamily: 'Outfit',
            ),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            color: AppColors.white,
            fontSize: 11,
            fontWeight: FontWeight.w500,
            fontFamily: 'Outfit',
          ),
        ),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: AppColors.teal, size: 18),
                const SizedBox(width: 8),
                Text(title, style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
            const Divider(height: 20),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool copyable;
  final Color? valueColor;

  const _DetailRow({
    required this.label,
    required this.value,
    this.copyable = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: valueColor ?? AppColors.darkGrey,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          if (copyable)
            GestureDetector(
              onTap: () {
                Clipboard.setData(ClipboardData(text: value));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('$label copied'),
                    duration: const Duration(seconds: 2),
                    backgroundColor: AppColors.navy,
                  ),
                );
              },
              child: const Icon(Icons.copy_outlined, size: 15, color: AppColors.midGrey),
            ),
        ],
      ),
    );
  }
}
