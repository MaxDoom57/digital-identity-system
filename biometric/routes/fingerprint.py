from flask import Blueprint, request, jsonify
from utils.image_processing import decode_base64_image, preprocess_fingerprint, extract_orb_features, match_descriptors
from utils.hashing import compute_feature_hash, compute_biometric_hash
import numpy as np
import cv2

fingerprint_bp = Blueprint('fingerprint', __name__)

@fingerprint_bp.route('/enroll', methods=['POST'])
def enroll_fingerprint():
    """Process fingerprint image and return biometric hash for blockchain storage"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        img = decode_base64_image(data['image'])
        if img is None:
            return jsonify({'error': 'Invalid image'}), 400

        processed = preprocess_fingerprint(img)
        keypoints, descriptors = extract_orb_features(processed)

        if descriptors is None or len(keypoints) < 10:
            return jsonify({'error': 'Could not extract fingerprint features. Please use a clearer image.'}), 400

        feature_hash = compute_feature_hash(descriptors)
        quality_score = min(len(keypoints) / 200, 1.0)

        return jsonify({
            'success': True,
            'biometricHash': feature_hash,
            'qualityScore': round(quality_score, 2),
            'keypointCount': len(keypoints),
            'message': 'Fingerprint enrolled successfully'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@fingerprint_bp.route('/verify', methods=['POST'])
def verify_fingerprint():
    """Verify fingerprint against stored hash"""
    try:
        data = request.get_json()
        if not data or 'image' not in data or 'storedHash' not in data:
            return jsonify({'error': 'Image and storedHash required'}), 400

        img = decode_base64_image(data['image'])
        processed = preprocess_fingerprint(img)
        keypoints, descriptors = extract_orb_features(processed)

        if descriptors is None:
            return jsonify({'error': 'Could not extract features'}), 400

        current_hash = compute_feature_hash(descriptors)
        match = current_hash == data['storedHash']
        confidence = 1.0 if match else 0.0

        return jsonify({
            'success': True,
            'match': match,
            'confidence': confidence,
            'message': 'Fingerprint matched' if match else 'Fingerprint did not match'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
