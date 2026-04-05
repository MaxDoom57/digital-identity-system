/// Citizen identity model — represents an enrolled citizen's data
class Citizen {
  final String did;
  final String citizenId;
  final String fullName;
  final String nicNumber;
  final String dateOfBirth;
  final String address;
  final String email;
  final String phoneNumber;
  final String gender;
  final String enrollmentDate;
  final String blockchainTxId;
  final IdentityStatus status;
  final String? rejectionReason;
  final String? qrCode;

  const Citizen({
    required this.did,
    required this.citizenId,
    required this.fullName,
    required this.nicNumber,
    required this.dateOfBirth,
    required this.address,
    required this.email,
    required this.phoneNumber,
    required this.gender,
    required this.enrollmentDate,
    required this.blockchainTxId,
    required this.status,
    this.rejectionReason,
    this.qrCode,
  });

  /// Build from /api/citizen/profile → citizen object
  factory Citizen.fromJson(Map<String, dynamic> json) {
    IdentityStatus st;
    switch ((json['status'] as String? ?? 'PENDING').toUpperCase()) {
      case 'APPROVED':  st = IdentityStatus.verified;  break;
      case 'REJECTED':  st = IdentityStatus.revoked;   break;
      case 'SUSPENDED': st = IdentityStatus.suspended; break;
      default:          st = IdentityStatus.pending;
    }
    return Citizen(
      did:            json['did']           as String? ?? '',
      citizenId:      json['citizenId']     as String? ?? '',
      fullName:       json['fullName']      as String? ?? '',
      nicNumber:      json['nicNumber']     as String? ?? '',
      dateOfBirth:    _fmt(json['dateOfBirth'] as String?),
      address:        json['address']       as String? ?? '',
      email:          json['email']         as String? ?? '',
      phoneNumber:    json['phone']         as String? ?? '',
      gender:         json['gender']        as String? ?? '',
      enrollmentDate: _fmt(json['createdAt'] as String?),
      blockchainTxId: json['blockchainTxId'] as String? ?? '',
      status:         st,
      rejectionReason: json['rejectionReason'] as String?,
      qrCode:          json['qrCode']          as String?,
    );
  }

  static String _fmt(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    try {
      final dt = DateTime.parse(raw);
      return '${dt.year}-${dt.month.toString().padLeft(2,'0')}-${dt.day.toString().padLeft(2,'0')}';
    } catch (_) { return raw; }
  }

  /// Demo citizen — used only for offline fallback / UI preview
  factory Citizen.demo() => const Citizen(
    did: 'did:fabric:lk:0x3f4a1b2c9d8e7f5a',
    citizenId: 'CIT123456',
    fullName: 'Kamal Perera',
    nicNumber: '199512345678V',
    dateOfBirth: '1995-05-18',
    address: '45/B, Galle Road, Colombo 03, Western Province',
    email: 'kamal.perera@email.com',
    phoneNumber: '+94 71 234 5678',
    gender: 'Male',
    enrollmentDate: '2025-01-14',
    blockchainTxId: 'tx:0xa1b2c3d4e5f6789012345678',
    status: IdentityStatus.verified,
  );
}

enum IdentityStatus {
  pending,
  verified,
  suspended,
  revoked,
}

extension IdentityStatusLabel on IdentityStatus {
  String get label {
    switch (this) {
      case IdentityStatus.pending:   return 'Pending Approval';
      case IdentityStatus.verified:  return 'Verified';
      case IdentityStatus.suspended: return 'Suspended';
      case IdentityStatus.revoked:   return 'Revoked';
    }
  }
}
