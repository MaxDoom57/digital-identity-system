import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../main.dart';
import '../models/citizen.dart';
import '../models/history_log.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedTab = 0;
  Citizen? _citizen;
  List<HistoryLog> _recentActivity = [];
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
      setState(() {
        _citizen = Citizen.fromJson(citizenJson);
      });
      // Cache updated citizen data
      await AuthService.updateCachedCitizen(citizenJson);

      // Load recent audit activity
      final citizenId = _citizen?.citizenId ?? '';
      if (citizenId.isNotEmpty) {
        try {
          final auditData = await ApiService.get('/api/admin/audit/$citizenId');
          if (auditData is List) {
            setState(() {
              _recentActivity = auditData
                  .take(5)
                  .map((e) => HistoryLog.fromAudit(e as Map<String, dynamic>))
                  .toList();
            });
          }
        } catch (_) {} // Audit is best-effort
      }
    } on ApiException {
      // Fall back to cached citizen data
      final cached = await AuthService.getCachedCitizen();
      if (cached != null && mounted) {
        setState(() => _citizen = Citizen.fromJson(cached));
      }
    } catch (_) {
      final cached = await AuthService.getCachedCitizen();
      if (cached != null && mounted) {
        setState(() => _citizen = Citizen.fromJson(cached));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await AuthService.logout();
    if (mounted) Navigator.pushReplacementNamed(context, AppRoutes.welcome);
  }

  static const List<_TabItem> _tabs = [
    _TabItem(icon: Icons.home_outlined,       activeIcon: Icons.home,             label: 'Home'),
    _TabItem(icon: Icons.badge_outlined,      activeIcon: Icons.badge,            label: 'My ID'),
    _TabItem(icon: Icons.tune_outlined,       activeIcon: Icons.tune,             label: 'Consent'),
    _TabItem(icon: Icons.history_outlined,    activeIcon: Icons.history,          label: 'History'),
  ];

  void _onTabTap(int index) {
    switch (index) {
      case 0: setState(() => _selectedTab = 0); break;
      case 1: Navigator.pushNamed(context, AppRoutes.digitalId); break;
      case 2: Navigator.pushNamed(context, AppRoutes.consent); break;
      case 3: Navigator.pushNamed(context, AppRoutes.history); break;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.navyDark,
        body: Center(child: CircularProgressIndicator(color: AppColors.teal)),
      );
    }

    final citizen = _citizen ?? Citizen.demo();

    return Scaffold(
      backgroundColor: AppColors.offWhite,
      body: CustomScrollView(
        slivers: [
          // Header
          SliverToBoxAdapter(child: _buildHeader(context, citizen)),

          // Quick actions
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
              child: Text('Quick Actions', style: Theme.of(context).textTheme.headlineSmall),
            ),
          ),
          SliverToBoxAdapter(child: _buildQuickActions(context)),

          // ID status card
          SliverToBoxAdapter(child: _buildIdStatusCard(context, citizen)),


          // Recent activity header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Recent Activity', style: Theme.of(context).textTheme.headlineSmall),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, AppRoutes.history),
                    child: const Text('View All', style: TextStyle(color: AppColors.teal, fontSize: 13)),
                  ),
                ],
              ),
            ),
          ),

          // Real activity tiles from blockchain audit
          SliverList(
            delegate: SliverChildListDelegate([
              if (_recentActivity.isEmpty)
                const Padding(
                  padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: Text('No recent activity found.',
                      style: TextStyle(color: AppColors.midGrey, fontSize: 13, fontFamily: 'Outfit')),
                )
              else
                ..._recentActivity.map((log) => _ActivityTile(
                      icon: log.method == AccessMethod.qrToken
                          ? Icons.qr_code_outlined
                          : Icons.account_balance_outlined,
                      orgName: log.organizationName,
                      action: log.method == AccessMethod.qrToken
                          ? 'Verified via QR Token'
                          : 'Accessed your identity',
                      time: log.accessedAt,
                      color: log.method == AccessMethod.qrToken
                          ? AppColors.teal
                          : AppColors.blue,
                    )),
              const SizedBox(height: 100),
            ]),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTab,
        onTap: _onTabTap,
        items: _tabs
            .map((t) => BottomNavigationBarItem(
                  icon: Icon(t.icon),
                  activeIcon: Icon(t.activeIcon),
                  label: t.label,
                ))
            .toList(),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, Citizen citizen) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.navyDark, AppColors.navy],
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.white.withOpacity(0.12),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.teal.withOpacity(0.5), width: 1.5),
                ),
                child: const Icon(Icons.person_outlined, color: AppColors.white, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Welcome,',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.white.withOpacity(0.55))),
                    Text(citizen.fullName,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: AppColors.white, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.logout_outlined, color: AppColors.white),
                onPressed: _logout,
                tooltip: 'Sign out',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      _QuickAction(
        icon: Icons.badge_outlined,
        label: 'View ID',
        color: AppColors.navy,
        onTap: () => Navigator.pushNamed(context, AppRoutes.digitalId),
      ),
      _QuickAction(
        icon: Icons.tune_outlined,
        label: 'Consent',
        color: AppColors.teal,
        onTap: () => Navigator.pushNamed(context, AppRoutes.consent),
      ),
      _QuickAction(
        icon: Icons.qr_code_2_outlined,
        label: 'QR Token',
        color: AppColors.gold,
        onTap: () => Navigator.pushNamed(context, AppRoutes.qrToken),
      ),
      _QuickAction(
        icon: Icons.history_outlined,
        label: 'History',
        color: AppColors.blue,
        onTap: () => Navigator.pushNamed(context, AppRoutes.history),
      ),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: actions.map((a) => _QuickActionCard(action: a)).toList(),
      ),
    );
  }

  Widget _buildIdStatusCard(BuildContext context, Citizen citizen) {
    final statusColor = citizen.status == IdentityStatus.verified
        ? AppColors.success
        : citizen.status == IdentityStatus.suspended
            ? AppColors.gold
            : citizen.status == IdentityStatus.revoked
                ? AppColors.error
                : AppColors.midGrey;

    final shortDid = citizen.did.isEmpty
        ? 'Pending'
        : citizen.did.length > 24
            ? '${citizen.did.substring(0, 20)}...'
            : citizen.did;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.shield_outlined, color: AppColors.teal, size: 20),
                  const SizedBox(width: 8),
                  Text('Identity Status', style: Theme.of(context).textTheme.titleLarge),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: statusColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          citizen.status.label,
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const Divider(height: 20),

              _StatusRow(
                icon: Icons.fingerprint,
                label: 'Blockchain DID',
                value: shortDid,
                valueColor: AppColors.navy,
              ),
              const SizedBox(height: 10),
              _StatusRow(
                icon: Icons.calendar_today_outlined,
                label: 'Enrolled On',
                value: citizen.enrollmentDate.isEmpty ? '—' : citizen.enrollmentDate,
              ),
              const SizedBox(height: 10),
              _StatusRow(
                icon: Icons.security_outlined,
                label: 'Biometric',
                value: 'Face + FIDO2 Device Key',
                valueColor: AppColors.teal,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---- Sub-widgets ----

class _QuickAction {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap});
}

class _QuickActionCard extends StatelessWidget {
  final _QuickAction action;
  const _QuickActionCard({super.key, required this.action});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: action.onTap,
      child: Container(
        width: 76,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.navy.withOpacity(0.06),
              blurRadius: 12,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: action.color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(action.icon, color: action.color, size: 22),
            ),
            const SizedBox(height: 8),
            Text(
              action.label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.darkGrey,
                fontFamily: 'Outfit',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final IconData icon;
  final String orgName;
  final String action;
  final String time;
  final Color color;

  const _ActivityTile({
    required this.icon,
    required this.orgName,
    required this.action,
    required this.time,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(orgName, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text(action, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Text(
            time,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _StatusRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.midGrey),
        const SizedBox(width: 8),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
        const Spacer(),
        Text(
          value,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: valueColor ?? AppColors.darkGrey,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _TabItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _TabItem({required this.icon, required this.activeIcon, required this.label});
}
