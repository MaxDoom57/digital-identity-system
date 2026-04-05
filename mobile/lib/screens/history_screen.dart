import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/history_log.dart';
import '../models/consent_model.dart';
import '../services/api_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<HistoryLog> _logs = [];
  bool _loading = true;
  String _filterMethod = 'All';

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    try {
      // Get citizenId first
      final profileData = await ApiService.get('/api/citizen/profile');
      final citizenJson = profileData['citizen'] as Map<String, dynamic>;
      final citizenId = citizenJson['citizenId'] as String? ?? '';

      if (citizenId.isNotEmpty) {
        final auditData = await ApiService.get('/api/admin/audit/$citizenId');
        if (auditData is List) {
          final logs = auditData
              .map((e) => HistoryLog.fromAudit(e as Map<String, dynamic>))
              .toList();
          if (mounted) setState(() => _logs = logs);
        }
      }
    } catch (_) {
      // Leave _logs empty — the empty state UI will show
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<HistoryLog> get _filtered {
    if (_filterMethod == 'All') return _logs;
    if (_filterMethod == 'Online') {
      return _logs.where((l) => l.method == AccessMethod.online).toList();
    }
    return _logs.where((l) => l.method == AccessMethod.qrToken).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.offWhite,
        body: Center(child: CircularProgressIndicator(color: AppColors.teal)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.offWhite,
      appBar: AppBar(
        title: const Text('Access History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () {
              setState(() { _loading = true; _logs = []; });
              _loadLogs();
            },
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.filter_list_outlined),
            onPressed: _showFilterSheet,
            tooltip: 'Filter',
          ),
        ],
      ),
      body: Column(
        children: [
          // Summary bar
          _SummaryBar(logs: _logs),

          // Active filter indicator
          if (_filterMethod != 'All')
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: AppColors.tealLight,
              child: Row(
                children: [
                  const Icon(Icons.filter_list, size: 14, color: AppColors.teal),
                  const SizedBox(width: 6),
                  Text(
                    'Showing: $_filterMethod',
                    style: const TextStyle(
                      color: AppColors.teal,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      fontFamily: 'Outfit',
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => setState(() => _filterMethod = 'All'),
                    child: const Text(
                      'Clear',
                      style: TextStyle(
                        color: AppColors.teal,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        fontFamily: 'Outfit',
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Log list
          Expanded(
            child: _filtered.isEmpty
                ? const _EmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filtered.length,
                    itemBuilder: (_, i) => _HistoryCard(log: _filtered[i]),
                  ),
          ),
        ],
      ),
    );
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Filter by Method', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 16),
              ...['All', 'Online', 'QR Token'].map((f) {
                final isSelected = _filterMethod == f;
                return ListTile(
                  leading: Icon(
                    f == 'Online'
                        ? Icons.cloud_outlined
                        : f == 'QR Token'
                            ? Icons.qr_code_2_outlined
                            : Icons.format_list_bulleted_outlined,
                    color: isSelected ? AppColors.teal : AppColors.midGrey,
                  ),
                  title: Text(
                    f,
                    style: TextStyle(
                      color: isSelected ? AppColors.teal : AppColors.darkGrey,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                      fontFamily: 'Outfit',
                    ),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle, color: AppColors.teal, size: 18)
                      : null,
                  onTap: () {
                    setState(() => _filterMethod = f);
                    Navigator.pop(context);
                  },
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}

// ---- Summary bar ----

class _SummaryBar extends StatelessWidget {
  final List<HistoryLog> logs;
  const _SummaryBar({required this.logs});

  @override
  Widget build(BuildContext context) {
    final onlineCount  = logs.where((l) => l.method == AccessMethod.online).length;
    final offlineCount = logs.where((l) => l.method == AccessMethod.qrToken).length;

    return Container(
      color: AppColors.navy,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      child: Row(
        children: [
          _SummaryStat(
            label: 'Total Accesses',
            value: '${logs.length}',
            icon: Icons.analytics_outlined,
          ),
          _Divider(),
          _SummaryStat(
            label: 'Online',
            value: '$onlineCount',
            icon: Icons.cloud_outlined,
          ),
          _Divider(),
          _SummaryStat(
            label: 'QR Token',
            value: '$offlineCount',
            icon: Icons.qr_code_2_outlined,
          ),
        ],
      ),
    );
  }
}

class _SummaryStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _SummaryStat({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: AppColors.teal, size: 18),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              fontFamily: 'Outfit',
            ),
          ),
          Text(
            label,
            style: TextStyle(
              color: AppColors.white.withOpacity(0.55),
              fontSize: 10,
              fontFamily: 'Outfit',
            ),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 40,
      color: AppColors.white.withOpacity(0.12),
    );
  }
}

// ---- History Card ----

class _HistoryCard extends StatelessWidget {
  final HistoryLog log;
  const _HistoryCard({required this.log});

  IconData get _orgIcon {
    switch (log.organizationType) {
      case 'Government Agency':     return Icons.account_balance_outlined;
      case 'Financial Institution': return Icons.account_balance_wallet_outlined;
      case 'Healthcare Provider':   return Icons.local_hospital_outlined;
      case 'Telecom Provider':      return Icons.cell_tower_outlined;
      default:                      return Icons.business_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOnline = log.method == AccessMethod.online;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showDetail(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Org icon
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.navy.withOpacity(0.07),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_orgIcon, color: AppColors.navy, size: 22),
              ),

              const SizedBox(width: 14),

              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(log.organizationName, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Icon(
                          isOnline ? Icons.cloud_outlined : Icons.qr_code_2_outlined,
                          size: 12,
                          color: isOnline ? AppColors.blue : AppColors.gold,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          log.method.label,
                          style: TextStyle(
                            color: isOnline ? AppColors.blue : AppColors.gold,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ],
                    ),
                    if (log.accessedFields.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: log.accessedFields
                            .take(3)
                            .map((f) => _MiniChip(label: fieldLabels[f] ?? f))
                            .toList()
                          ..addAll(
                            log.accessedFields.length > 3
                                ? [_MiniChip(label: '+${log.accessedFields.length - 3} more')]
                                : [],
                          ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // Time
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Icon(Icons.chevron_right, color: AppColors.midGrey, size: 18),
                  const SizedBox(height: 4),
                  Text(
                    log.accessedAt.length >= 10 ? log.accessedAt.substring(0, 10) : log.accessedAt,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _HistoryDetailSheet(log: log),
    );
  }
}

class _MiniChip extends StatelessWidget {
  final String label;
  const _MiniChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.lightGrey,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 10,
          color: AppColors.darkGrey,
          fontFamily: 'Outfit',
        ),
      ),
    );
  }
}

// ---- History Detail Sheet ----

class _HistoryDetailSheet extends StatelessWidget {
  final HistoryLog log;
  const _HistoryDetailSheet({required this.log});

  @override
  Widget build(BuildContext context) {
    final isOnline = log.method == AccessMethod.online;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 36, height: 4,
              decoration: BoxDecoration(
                color: AppColors.lightGrey,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),

          Text('Access Detail', style: Theme.of(context).textTheme.headlineMedium),
          const Divider(height: 20),

          _DetailItem(icon: Icons.business_outlined, label: 'Organization', value: log.organizationName),
          if (log.organizationType.isNotEmpty)
            _DetailItem(icon: Icons.category_outlined, label: 'Type', value: log.organizationType),
          _DetailItem(
            icon: isOnline ? Icons.cloud_outlined : Icons.qr_code_2_outlined,
            label: 'Method',
            value: log.method.label,
            valueColor: isOnline ? AppColors.blue : AppColors.gold,
          ),
          _DetailItem(icon: Icons.access_time_outlined, label: 'Accessed At', value: log.accessedAt),

          if (log.accessedFields.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('Fields Accessed', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: log.accessedFields
                  .map((f) => _FieldTag(label: fieldLabels[f] ?? f))
                  .toList(),
            ),
          ],

          const SizedBox(height: 24),

          OutlinedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close, size: 18),
            label: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

class _DetailItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _DetailItem({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.midGrey),
          const SizedBox(width: 10),
          SizedBox(
            width: 110,
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
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
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.teal, fontSize: 11,
          fontWeight: FontWeight.w500, fontFamily: 'Outfit',
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.history_outlined, size: 52, color: AppColors.lightGrey),
          const SizedBox(height: 12),
          Text(
            'No access records',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.midGrey),
          ),
        ],
      ),
    );
  }
}
