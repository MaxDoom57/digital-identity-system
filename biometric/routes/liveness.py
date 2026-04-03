from flask import Blueprint, request, jsonify
from utils.image_processing import decode_base64_image
import numpy as np
import cv2

liveness_bp = Blueprint('liveness', __name__)

def compute_laplacian_variance(img: np.ndarray) -> float:
    """Measure image sharpness — real faces have natural blur variation"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def compute_frequency_score(img: np.ndarray) -> float:
    """Deepfake images often have unusual frequency patterns"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude = 20 * np.log(np.abs(fshift) + 1)
    h, w = magnitude.shape
    center_region = magnitude[h//4:3*h//4, w//4:3*w//4]
    edge_region = magnitude - 0
    center_energy = np.mean(center_region)
    total_energy = np.mean(magnitude)
    return center_energy / (total_energy + 1e-6)

def check_color_distribution(img: np.ndarray) -> float:
    """Real faces have natural skin tone distribution"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    skin_lower = np.array([0, 20, 70], dtype=np.uint8)
    skin_upper = np.array([20, 255, 255], dtype=np.uint8)
    skin_mask = cv2.inRange(hsv, skin_lower, skin_upper)
    skin_ratio = np.sum(skin_mask > 0) / (img.shape[0] * img.shape[1])
    return skin_ratio

def detect_face_present(img: np.ndarray) -> bool:
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=2, minSize=(30, 30))
    return len(faces) > 0


@liveness_bp.route('/check', methods=['POST'])
def check_liveness():
    """
    Multi-factor liveness detection against deepfakes and printed photos.
    Checks: sharpness variance, frequency analysis, skin tone distribution, face presence
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        img = decode_base64_image(data['image'])
        if img is None:
            return jsonify({'error': 'Invalid image'}), 400

        results = {}
        scores = []

        # Check 1 — Face present
        face_present = detect_face_present(img)
        results['facePresent'] = face_present
        if not face_present:
            return jsonify({
                'isLive': False,
                'confidence': 0.0,
                'reason': 'No face detected',
                'details': results
            })

        # Check 2 — Sharpness (real faces: 50-800, printed: <30, deepfake: >1000)
        sharpness = compute_laplacian_variance(img)
        sharpness_score = 1.0 if 10 < sharpness < 2000 else 0.5
        results['sharpnessScore'] = round(sharpness, 2)
        results['sharpnessPass'] = sharpness_score > 0.5
        scores.append(sharpness_score)

        # Check 3 — Frequency analysis (deepfakes have abnormal frequency patterns)
        freq_score = compute_frequency_score(img)
        freq_pass = 0.5 < freq_score < 8.0
        results['frequencyScore'] = round(freq_score, 3)
        results['frequencyPass'] = freq_pass
        scores.append(1.0 if freq_pass else 0.4)

        # Check 4 — Skin tone presence
        skin_ratio = check_color_distribution(img)
        skin_pass = skin_ratio > 0.05
        results['skinRatio'] = round(skin_ratio, 3)
        results['skinPass'] = skin_pass
        scores.append(1.0 if skin_pass else 0.2)

        # Final decision
        final_score = np.mean(scores)
        is_live = final_score > 0.45 and face_present

        return jsonify({
            'isLive': bool(is_live),
            'confidence': round(float(final_score), 3),
            'reason': 'Liveness confirmed' if is_live else 'Liveness check failed — possible spoof attempt',
            'details': results
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@liveness_bp.route('/multiframe', methods=['POST'])
def multiframe_liveness():
    """
    Multi-frame liveness detection — analyzes multiple frames for motion consistency.
    More robust against static deepfakes and printed photos.
    """
    try:
        data = request.get_json()
        if not data or 'frames' not in data:
            return jsonify({'error': 'frames array required'}), 400

        frames = data['frames']
        if len(frames) < 2:
            return jsonify({'error': 'At least 2 frames required'}), 400

        decoded_frames = []
        for f in frames[:5]:
            img = decode_base64_image(f)
            if img is not None:
                decoded_frames.append(img)

        if len(decoded_frames) < 2:
            return jsonify({'error': 'Could not decode frames'}), 400

        # Check motion between frames — real faces have natural micro-movements
        motion_scores = []
        for i in range(1, len(decoded_frames)):
            gray1 = cv2.cvtColor(decoded_frames[i-1], cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(decoded_frames[i], cv2.COLOR_BGR2GRAY)
            gray1 = cv2.resize(gray1, (128, 128))
            gray2 = cv2.resize(gray2, (128, 128))
            diff = cv2.absdiff(gray1, gray2)
            motion = np.mean(diff)
            motion_scores.append(motion)

        avg_motion = np.mean(motion_scores)
        # Real faces: 1-15 motion score, static images: <0.5, replay attacks: >30
        motion_pass = 0.5 < avg_motion < 30
        is_live = motion_pass and len(decoded_frames) >= 2

        return jsonify({
            'isLive': bool(is_live),
            'confidence': round(min(avg_motion / 10, 1.0), 3),
            'avgMotion': round(float(avg_motion), 3),
            'frameCount': len(decoded_frames),
            'reason': 'Natural motion detected' if is_live else 'Insufficient or abnormal motion — possible static spoof'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
