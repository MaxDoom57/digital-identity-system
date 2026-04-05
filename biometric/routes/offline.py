from flask import Blueprint, request, jsonify
from utils.image_processing import decode_base64_image, extract_orb_features, preprocess_fingerprint
from utils.hashing import compute_feature_hash
import numpy as np
import cv2
import json
import base64
import hashlib
import time

offline_bp = Blueprint('offline', __name__)

def generate_offline_token(citizen_id: str, biometric_hash: str, valid_seconds: int = 3600) -> dict:
    """Generate a signed offline verification token valid for limited time"""
    expiry = int(time.time()) + valid_seconds
    payload = {
        'citizenId': citizen_id,
        'biometricHash': biometric_hash,
        'expiry': expiry,
        'issuedAt': int(time.time())
    }
    payload_str = json.dumps(payload, sort_keys=True)
    signature = hashlib.sha256(
        (payload_str + 'offline_secret_key_2025').encode()
    ).hexdigest()

    token = base64.b64encode(json.dumps({
        'payload': payload,
        'signature': signature
    }).encode()).decode()

    return {
        'token': token,
        'expiry': expiry,
        'validFor': valid_seconds
    }

def verify_offline_token(token: str, current_biometric_hash: str) -> dict:
    """Verify an offline token against current biometric"""
    try:
        decoded = json.loads(base64.b64decode(token).decode())
        payload = decoded['payload']
        signature = decoded['signature']

        payload_str = json.dumps(payload, sort_keys=True)
        expected_sig = hashlib.sha256(
            (payload_str + 'offline_secret_key_2025').encode()
        ).hexdigest()

        if signature != expected_sig:
            return {'valid': False, 'reason': 'Invalid token signature'}

        if int(time.time()) > payload['expiry']:
            return {'valid': False, 'reason': 'Token expired'}

        if payload['biometricHash'] != current_biometric_hash:
            return {'valid': False, 'reason': 'Biometric mismatch'}

        return {
            'valid': True,
            'citizenId': payload['citizenId'],
            'reason': 'Offline verification successful'
        }
    except Exception as e:
        return {'valid': False, 'reason': f'Token error: {str(e)}'}


@offline_bp.route('/generate-token', methods=['POST'])
def generate_token():
    """Generate offline verification token for a citizen"""
    try:
        data = request.get_json()
        if not data or 'citizenId' not in data or 'biometricHash' not in data:
            return jsonify({'error': 'citizenId and biometricHash required'}), 400

        valid_seconds = data.get('validSeconds', 3600)
        result = generate_offline_token(
            data['citizenId'],
            data['biometricHash'],
            valid_seconds
        )

        return jsonify({'success': True, **result})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@offline_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify an offline token with current biometric"""
    try:
        data = request.get_json()
        if not data or 'token' not in data or 'image' not in data:
            return jsonify({'error': 'token and image required'}), 400

        img = decode_base64_image(data['image'])
        processed = preprocess_fingerprint(img)
        _, descriptors = extract_orb_features(processed)

        if descriptors is None:
            img_face = decode_base64_image(data['image'])
            gray = cv2.cvtColor(img_face, cv2.COLOR_BGR2GRAY)
            resized = cv2.resize(gray, (128, 128))
            hog = cv2.HOGDescriptor((128,128), (16,16), (8,8), (8,8), 9)
            features = hog.compute(resized)
            current_hash = compute_feature_hash(features)
        else:
            current_hash = compute_feature_hash(descriptors)

        result = verify_offline_token(data['token'], current_hash)
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
