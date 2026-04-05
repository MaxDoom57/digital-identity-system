/// Consent model — represents a field-level consent record on the blockchain
class ConsentRecord {
  final String id;
  final String organizationName;
  final String organizationId;
  final String organizationType;
  final List<String> requestedFields;
  final List<String> approvedFields;
  final ConsentStatus status;
  final String requestedAt;
  final String? approvedAt;
  final String? expiresAt;
  final String? purpose;

  const ConsentRecord({
    required this.id,
    required this.organizationName,
    required this.organizationId,
    required this.organizationType,
    required this.requestedFields,
    required this.approvedFields,
    required this.status,
    required this.requestedAt,
    this.approvedAt,
    this.expiresAt,
    this.purpose,
  });

  /// Build from a (orgId, fields) entry returned by /api/consent/profile/:citizenId
  /// orgInfo is the matching org object from /api/admin/orgs (may be null).
  factory ConsentRecord.fromApi({
    required String orgId,
    required List<String> approvedFields,
    Map<String, dynamic>? orgInfo,
  }) {
    return ConsentRecord(
      id:               'cns_$orgId',
      organizationName: orgInfo?['orgName'] as String? ?? orgId,
      organizationId:   orgId,
      organizationType: orgInfo?['sector']  as String? ?? 'Organization',
      requestedFields:  approvedFields,
      approvedFields:   approvedFields,
      status:           ConsentStatus.active,
      requestedAt:      '',
      approvedAt:       '',
    );
  }

  /// Demo consent list for UI demonstration
  static List<ConsentRecord> demoList() => [
    const ConsentRecord(
      id: 'cns_001',
      organizationName: 'Bank of Ceylon',
      organizationId: 'org:boc:lk',
      organizationType: 'Financial Institution',
      requestedFields: ['fullName', 'nicNumber', 'dateOfBirth', 'address', 'email'],
      approvedFields: ['fullName', 'nicNumber', 'dateOfBirth'],
      status: ConsentStatus.active,
      requestedAt: '2025-01-20',
      approvedAt: '2025-01-21',
      expiresAt: '2026-01-21',
      purpose: 'KYC verification for account opening',
    ),
    const ConsentRecord(
      id: 'cns_002',
      organizationName: 'Department of Motor Traffic',
      organizationId: 'org:dmt:gov:lk',
      organizationType: 'Government Agency',
      requestedFields: ['fullName', 'nicNumber', 'dateOfBirth', 'address', 'gender'],
      approvedFields: ['fullName', 'nicNumber', 'dateOfBirth', 'address', 'gender'],
      status: ConsentStatus.active,
      requestedAt: '2025-02-05',
      approvedAt: '2025-02-05',
      expiresAt: '2027-02-05',
      purpose: "Driving licence renewal verification",
    ),
    const ConsentRecord(
      id: 'cns_003',
      organizationName: 'Lanka Hospital',
      organizationId: 'org:lhp:lk',
      organizationType: 'Healthcare Provider',
      requestedFields: ['fullName', 'dateOfBirth', 'gender', 'address'],
      approvedFields: [],
      status: ConsentStatus.pending,
      requestedAt: '2025-03-10',
      purpose: 'Patient registration and medical records',
    ),
    const ConsentRecord(
      id: 'cns_004',
      organizationName: 'Sri Lanka Telecom',
      organizationId: 'org:slt:lk',
      organizationType: 'Telecom Provider',
      requestedFields: ['fullName', 'nicNumber', 'address', 'phoneNumber'],
      approvedFields: ['fullName', 'nicNumber'],
      status: ConsentStatus.revoked,
      requestedAt: '2024-11-01',
      approvedAt: '2024-11-02',
      purpose: 'Prepaid SIM registration',
    ),
  ];
}

enum ConsentStatus {
  pending,
  active,
  expired,
  revoked,
}

extension ConsentStatusLabel on ConsentStatus {
  String get label {
    switch (this) {
      case ConsentStatus.pending: return 'Pending';
      case ConsentStatus.active:  return 'Active';
      case ConsentStatus.expired: return 'Expired';
      case ConsentStatus.revoked: return 'Revoked';
    }
  }
}

/// Human-readable field labels
const Map<String, String> fieldLabels = {
  'fullName':    'Full Name',
  'nicNumber':   'NIC Number',
  'dateOfBirth': 'Date of Birth',
  'address':     'Address',
  'email':       'Email Address',
  'phoneNumber': 'Phone Number',
  'gender':      'Gender',
};
