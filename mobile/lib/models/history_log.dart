/// Access history log — records every time an organization accessed citizen data
class HistoryLog {
  final String id;
  final String organizationName;
  final String organizationId;
  final String organizationType;
  final List<String> accessedFields;
  final String accessedAt;
  final AccessMethod method;
  final bool wasOnline;

  const HistoryLog({
    required this.id,
    required this.organizationName,
    required this.organizationId,
    required this.organizationType,
    required this.accessedFields,
    required this.accessedAt,
    required this.method,
    required this.wasOnline,
  });

  /// Build from a blockchain audit record returned by /api/admin/audit/:citizenId
  /// Backend shape: { TxID, Timestamp, Value: { action, orgId, fields } }
  factory HistoryLog.fromAudit(Map<String, dynamic> json) {
    final value = (json['Value'] ?? json['Record'] ?? {}) as Map<String, dynamic>;
    final action = (value['action'] as String? ?? '').toUpperCase();
    final isQr  = action.contains('QR') || action.contains('OFFLINE') || action.contains('TOKEN');

    // Parse Unix timestamp (seconds)
    String ts = '';
    final rawTs = json['Timestamp'];
    if (rawTs != null) {
      try {
        final dt = DateTime.fromMillisecondsSinceEpoch((rawTs as num).toInt() * 1000);
        ts = '${dt.year}-${dt.month.toString().padLeft(2,'0')}-${dt.day.toString().padLeft(2,'0')} '
            '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
      } catch (_) {}
    }

    final rawFields = value['fields'];
    final fields = rawFields is List
        ? rawFields.map((e) => e.toString()).toList()
        : <String>[];

    final orgId = value['orgId'] as String? ?? '—';

    return HistoryLog(
      id:               json['TxID'] as String? ?? json['txId'] as String? ?? '',
      organizationName: orgId,
      organizationId:   orgId,
      organizationType: '',
      accessedFields:   fields,
      accessedAt:       ts,
      method:           isQr ? AccessMethod.qrToken : AccessMethod.online,
      wasOnline:        !isQr,
    );
  }

  static List<HistoryLog> demoList() => [
    const HistoryLog(
      id: 'log_001',
      organizationName: 'Bank of Ceylon',
      organizationId: 'org:boc:lk',
      organizationType: 'Financial Institution',
      accessedFields: ['fullName', 'nicNumber', 'dateOfBirth'],
      accessedAt: '2025-03-28 10:14',
      method: AccessMethod.online,
      wasOnline: true,
    ),
    const HistoryLog(
      id: 'log_002',
      organizationName: 'Department of Motor Traffic',
      organizationId: 'org:dmt:gov:lk',
      organizationType: 'Government Agency',
      accessedFields: ['fullName', 'nicNumber', 'dateOfBirth', 'address', 'gender'],
      accessedAt: '2025-03-25 14:42',
      method: AccessMethod.qrToken,
      wasOnline: false,
    ),
    const HistoryLog(
      id: 'log_003',
      organizationName: 'Bank of Ceylon',
      organizationId: 'org:boc:lk',
      organizationType: 'Financial Institution',
      accessedFields: ['fullName', 'nicNumber'],
      accessedAt: '2025-03-20 09:05',
      method: AccessMethod.online,
      wasOnline: true,
    ),
    const HistoryLog(
      id: 'log_004',
      organizationName: 'Sampath Bank',
      organizationId: 'org:sampath:lk',
      organizationType: 'Financial Institution',
      accessedFields: ['fullName', 'nicNumber', 'dateOfBirth', 'address'],
      accessedAt: '2025-03-15 16:30',
      method: AccessMethod.online,
      wasOnline: true,
    ),
    const HistoryLog(
      id: 'log_005',
      organizationName: 'Department of Motor Traffic',
      organizationId: 'org:dmt:gov:lk',
      organizationType: 'Government Agency',
      accessedFields: ['fullName', 'gender', 'dateOfBirth'],
      accessedAt: '2025-03-10 11:20',
      method: AccessMethod.qrToken,
      wasOnline: false,
    ),
  ];
}

enum AccessMethod {
  online,
  qrToken,
}

extension AccessMethodLabel on AccessMethod {
  String get label {
    switch (this) {
      case AccessMethod.online:   return 'Online Verification';
      case AccessMethod.qrToken: return 'Offline QR Token';
    }
  }
}
