import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../models/consent_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class ConsentScreen extends StatefulWidget {
  const ConsentScreen({super.key});

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<ConsentRecord> _consents = [];
  bool _loading = true;
  String? _citizenId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadConsents();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadConsents() async {
    try {
      // Get citizenId from profile
      final profileData = await ApiService.get('/api/citizen/profile');
      final citizenJson = profileData['citizen'] as Map<String, dynamic>;
      final citizenId = citizenJson['citizenId'] as String? ?? '';
      _citizenId = citizenId;

      if (citizenId.isEmpty) {
        if (mounted) setState(() => _loading = false);
        return;
      }

      // Load consent profile and org info in parallel
      final results = await Future.wait([
        ApiService.get('/api/consent/profile/$citizenId'),
        ApiService.get('/api/admin/orgs').catchError((_) => <dynamic>[]),
      ]);

      final consentData = results[0] as Map<String, dynamic>;
      final orgsRaw = results[1];

      // Build orgId → orgInfo map
      final Map<String, Map<String, dynamic>> orgMap = {};
      if (orgsRaw is List) {
        for (final org in orgsRaw) {
          if (org is Map<String, dynamic>) {
            final id = org['orgId'] as String? ?? org['id'] as String? ?? '';
            if (id.isNotEmpty) orgMap[id] = org;
          }
        }
      }

      // Parse permissions: {orgId: [fields]}
      final permissions = consentData['permissions'] as Map<String, dynamic>? ?? {};
      final records = permissions.entries.map((e) {
        final fields = (e.value as List?)
            ?.map((f) => f.toString())
            .toList() ?? [];
        return ConsentRecord.fromApi(
          orgId: e.key,
          approvedFields: fields,
          orgInfo: orgMap[e.key],
        );
      }).toList();

      if (mounted) {
        setState(() {
          _consents = records;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<ConsentRecord> _filtered(ConsentStatus status) =>
      _consents.where((c) => c.status == status).toList();

  List<ConsentRecord> get _pending => _filtered(ConsentStatus.pending);
  List<ConsentRecord> get _active  => _filtered(ConsentStatus.active);
  List<ConsentRecord> get _others  =>
      _consents.where((c) => c.status == ConsentStatus.expired || c.status == ConsentStatus.revoked).toList();

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
        title: const Text('Consent Management'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.white,
          unselectedLabelColor: AppColors.white.withOpacity(0.5),
          indicatorColor: AppColors.teal,
          indicatorWeight: 3,
          labelStyle: const TextStyle(
            fontFamily: 'Outfit',
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
          tabs: [
            Tab(text: 'Pending (${_pending.length})'),
            Tab(text: 'Active (${_active.length})'),
            Tab(text: 'Inactive'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _ConsentList(
            records: _pending,
            emptyMessage: 'No pending consent requests',
            emptyIcon: Icons.inbox_outlined,
            onApprove: _handleApprove,
            onRevoke: null,
          ),
          _ConsentList(
            records: _active,
            emptyMessage: 'No active consents',
            emptyIcon: Icons.check_circle_outline,
            onApprove: null,
            onRevoke: _handleRevoke,
          ),
          _ConsentList(
            records: _others,
            emptyMessage: 'No inactive records',
            emptyIcon: Icons.history_outlined,
            onApprove: null,
            onRevoke: null,
          ),
        ],
      ),
    );
  }

  void _handleApprove(ConsentRecord record) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ConsentApprovalSheet(
        record: record,
        onConfirm: (approvedFields) async {
          Navigator.pop(context);
          try {
            await ApiService.post('/api/consent/grant', {
              'citizenId': _citizenId,
              'orgId': record.organizationId,
              'fields': approvedFields,
            });
            setState(() {
              final i = _consents.indexWhere((c) => c.id == record.id);
              if (i >= 0) {
                _consents[i] = ConsentRecord(
                  id: record.id,
                  organizationName: record.organizationName,
                  organizationId: record.organizationId,
                  organizationType: record.organizationType,
                  requestedFields: record.requestedFields,
                  approvedFields: approvedFields,
                  status: ConsentStatus.active,
                  requestedAt: record.requestedAt,
                  approvedAt: DateTime.now().toIso8601String().substring(0, 10),
                  purpose: record.purpose,
                );
              }
            });
            _showSnack('Consent granted to ${record.organizationName}', AppColors.success);
          } on ApiException catch (e) {
            _showSnack(e.message, AppColors.error);
          } catch (_) {
            _showSnack('Failed to grant consent', AppColors.error);
          }
        },
      ),
    );
  }

  void _handleRevoke(ConsentRecord record) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Revoke Consent'),
        content: Text(
          'Revoke access for ${record.organizationName}? They will no longer be able to access your identity data.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await ApiService.post('/api/consent/decline', {
                  'citizenId': _citizenId,
                  'orgId': record.organizationId,
                });
                setState(() {
                  final i = _consents.indexWhere((c) => c.id == record.id);
                  if (i >= 0) {
                    _consents[i] = ConsentRecord(
                      id: record.id,
                      organizationName: record.organizationName,
                      organizationId: record.organizationId,
                      organizationType: record.organizationType,
                      requestedFields: record.requestedFields,
                      approvedFields: record.approvedFields,
                      status: ConsentStatus.revoked,
                      requestedAt: record.requestedAt,
                      approvedAt: record.approvedAt,
                      purpose: record.purpose,
                    );
                  }
                });
                _showSnack('Consent revoked for ${record.organizationName}', AppColors.error);
              } on ApiException catch (e) {
                _showSnack(e.message, AppColors.error);
              } catch (_) {
                _showSnack('Failed to revoke consent', AppColors.error);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Revoke'),
          ),
        ],
      ),
    );
  }

  void _showSnack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: color,
        duration: const Duration(seconds: 3),
      ),
    );
  }
}

// ---- Consent List ----

class _ConsentList extends StatelessWidget {
  final List<ConsentRecord> records;
  final String emptyMessage;
  final IconData emptyIcon;
  final void Function(ConsentRecord)? onApprove;
  final void Function(ConsentRecord)? onRevoke;

  const _ConsentList({
    required this.records,
    required this.emptyMessage,
    required this.emptyIcon,
    this.onApprove,
    this.onRevoke,
  });

  @override
  Widget build(BuildContext context) {
    if (records.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(emptyIcon, size: 48, color: AppColors.lightGrey),
            const SizedBox(height: 12),
            Text(
              emptyMessage,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.midGrey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: records.length,
      itemBuilder: (_, i) => _ConsentCard(
        record: records[i],
        onApprove: onApprove,
        onRevoke: onRevoke,
      ),
    );
  }
}

// ---- Consent Card ----

class _ConsentCard extends StatelessWidget {
  final ConsentRecord record;
  final void Function(ConsentRecord)? onApprove;
  final void Function(ConsentRecord)? onRevoke;

  const _ConsentCard({
    required this.record,
    this.onApprove,
    this.onRevoke,
  });

  Color get _statusColor {
    switch (record.status) {
      case ConsentStatus.active:   return AppColors.success;
      case ConsentStatus.pending:  return AppColors.warning;
      case ConsentStatus.expired:  return AppColors.midGrey;
      case ConsentStatus.revoked:  return AppColors.error;
    }
  }

  IconData get _orgIcon {
    switch (record.organizationType) {
      case 'Government Agency':       return Icons.account_balance_outlined;
      case 'Financial Institution':   return Icons.account_balance_wallet_outlined;
      case 'Healthcare Provider':     return Icons.local_hospital_outlined;
      case 'Telecom Provider':        return Icons.cell_tower_outlined;
      default:                        return Icons.business_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.navy.withOpacity(0.07),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(_orgIcon, color: AppColors.navy, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(record.organizationName, style: Theme.of(context).textTheme.titleMedium),
                      Text(record.organizationType, style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    record.status.label,
                    style: TextStyle(
                      color: _statusColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'Outfit',
                    ),
                  ),
                ),
              ],
            ),

            if (record.purpose != null) ...[
              const SizedBox(height: 12),
              Text(
                record.purpose!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.midGrey,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],

            const SizedBox(height: 12),

            // Fields section
            Text(
              record.status == ConsentStatus.pending ? 'Requested Fields' : 'Shared Fields',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: (record.status == ConsentStatus.pending
                      ? record.requestedFields
                      : record.approvedFields)
                  .map((f) => _FieldChip(label: fieldLabels[f] ?? f))
                  .toList(),
            ),

            // Dates
            if (record.approvedAt != null || record.expiresAt != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (record.approvedAt != null && record.approvedAt!.isNotEmpty) ...[
                    const Icon(Icons.check_circle_outline, size: 13, color: AppColors.midGrey),
                    const SizedBox(width: 4),
                    Text('Approved ${record.approvedAt}',
                        style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(width: 12),
                  ],
                  if (record.expiresAt != null) ...[
                    const Icon(Icons.schedule_outlined, size: 13, color: AppColors.midGrey),
                    const SizedBox(width: 4),
                    Text('Expires ${record.expiresAt}',
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ],
              ),
            ],

            // Actions
            if (onApprove != null || onRevoke != null) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  if (onApprove != null)
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => onApprove!(record),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(0, 40),
                          backgroundColor: AppColors.teal,
                        ),
                        child: const Text('Review & Approve'),
                      ),
                    ),
                  if (onRevoke != null) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => onRevoke!(record),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 40),
                          foregroundColor: AppColors.error,
                          side: const BorderSide(color: AppColors.error),
                        ),
                        child: const Text('Revoke'),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _FieldChip extends StatelessWidget {
  final String label;
  const _FieldChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.tealLight,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.teal,
          fontSize: 11,
          fontWeight: FontWeight.w500,
          fontFamily: 'Outfit',
        ),
      ),
    );
  }
}

// ---- Approval Bottom Sheet ----

class _ConsentApprovalSheet extends StatefulWidget {
  final ConsentRecord record;
  final void Function(List<String>) onConfirm;

  const _ConsentApprovalSheet({required this.record, required this.onConfirm});

  @override
  State<_ConsentApprovalSheet> createState() => _ConsentApprovalSheetState();
}

class _ConsentApprovalSheetState extends State<_ConsentApprovalSheet> {
  late Set<String> _selected;

  @override
  void initState() {
    super.initState();
    _selected = Set.from(widget.record.requestedFields);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.lightGrey,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),

          Text('Grant Access', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            'Select which fields to share with ${widget.record.organizationName}',
            style: Theme.of(context).textTheme.bodySmall,
          ),

          const SizedBox(height: 20),

          // Field toggles
          ...widget.record.requestedFields.map((field) {
            final label = fieldLabels[field] ?? field;
            return CheckboxListTile(
              value: _selected.contains(field),
              onChanged: (v) => setState(() {
                if (v == true) {
                  _selected.add(field);
                } else {
                  _selected.remove(field);
                }
              }),
              title: Text(label, style: Theme.of(context).textTheme.bodyMedium),
              activeColor: AppColors.teal,
              contentPadding: EdgeInsets.zero,
              dense: true,
              controlAffinity: ListTileControlAffinity.leading,
            );
          }),

          const SizedBox(height: 20),

          ElevatedButton(
            onPressed: _selected.isEmpty
                ? null
                : () => widget.onConfirm(_selected.toList()),
            child: Text('Grant Access to ${_selected.length} Fields'),
          ),
        ],
      ),
    );
  }
}
