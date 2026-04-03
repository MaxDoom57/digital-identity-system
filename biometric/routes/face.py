from flask import Blueprint, request, jsonify
from utils.image_processing import decode_base64_image, preprocess_face, encode_image_base64
from utils.hashing import compute_feature_hash, compute_biometric_hash
import numpy as np
import cv2

face_bp = Blueprint('face', __name__)

def get_face_cascade():
    return cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def extract_face_features(img: np.ndarray):
    """Detect face and extract feature vector using HOG"""
    cascade = get_face_cascade()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=3, minSize=(30, 30))

    if len(faces) == 0:
        return None, None

    x, y, w, h = faces[0]
    face_roi = gray[y:y+h, x:x+w]
    face_resized = cv2.resize(face_roi, (128, 128))

    hog = cv2.HOGDescriptor((128,128), (16,16), (8,8), (8,8), 9)
    features = hog.compute(face_resized)

    return features, (x, y, w, h)


@face_bp.route('/enroll', methods=['POST'])
def enroll_face():
    """Process face image and return biometric hash"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        img = decode_base64_image(data['image'])
        if img is None:
            return jsonify({'error': 'Invalid image'}), 400

        features, face_coords = extract_face_features(img)

        if features is None:
            return jsonify({'error': 'No face detected. Please ensure your face is clearly visible.'}), 400

        feature_hash = compute_feature_hash(features)

        return jsonify({
            'success': True,
            'biometricHash': feature_hash,
            'faceDetected': True,
            'faceCoords': {'x': int(face_coords[0]), 'y': int(face_coords[1]),
                          'w': int(face_coords[2]), 'h': int(face_coords[3])},
            'message': 'Face enrolled successfully'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@face_bp.route('/verify', methods=['POST'])
def verify_face():
    """Verify face against stored hash"""
    try:
        data = request.get_json()
        if not data or 'image' not in data or 'storedHash' not in data:
            return jsonify({'error': 'Image and storedHash required'}), 400

        img = decode_base64_image(data['image'])
        features, _ = extract_face_features(img)

        if features is None:
            return jsonify({'error': 'No face detected'}), 400

        current_hash = compute_feature_hash(features)
        match = current_hash == data['storedHash']

        return jsonify({
            'success': True,
            'match': match,
            'confidence': 1.0 if match else 0.0,
            'message': 'Face matched' if match else 'Face did not match'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
