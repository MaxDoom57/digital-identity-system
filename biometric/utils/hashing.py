import hashlib
import hmac
import base64
import numpy as np

SECRET_KEY = b'digital_identity_biometric_secret_2025'

def compute_biometric_hash(data: bytes) -> str:
    """Compute HMAC-SHA256 hash of biometric data"""
    h = hmac.new(SECRET_KEY, data, hashlib.sha256)
    return h.hexdigest()

def compute_feature_hash(features: np.ndarray) -> str:
    """Hash a numpy feature vector"""
    feature_bytes = features.astype(np.float32).tobytes()
    return compute_biometric_hash(feature_bytes)

def verify_biometric_hash(data: bytes, expected_hash: str) -> bool:
    """Verify biometric data against stored hash"""
    computed = compute_biometric_hash(data)
    return hmac.compare_digest(computed, expected_hash)

def encode_image_b64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode('utf-8')

def decode_image_b64(b64_string: str) -> bytes:
    return base64.b64decode(b64_string)
