import cv2
import numpy as np
from PIL import Image
import io
import base64

def decode_base64_image(b64_string: str) -> np.ndarray:
    """Decode base64 image to OpenCV format"""
    if ',' in b64_string:
        b64_string = b64_string.split(',')[1]
    img_bytes = base64.b64decode(b64_string)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return img

def encode_image_base64(img: np.ndarray) -> str:
    """Encode OpenCV image to base64"""
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

def preprocess_fingerprint(img: np.ndarray) -> np.ndarray:
    """Preprocess fingerprint image for feature extraction"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    resized = cv2.resize(gray, (256, 256))
    equalized = cv2.equalizeHist(resized)
    blurred = cv2.GaussianBlur(equalized, (3, 3), 0)
    return blurred

def preprocess_face(img: np.ndarray) -> np.ndarray:
    """Preprocess face image"""
    resized = cv2.resize(img, (224, 224))
    return resized

def extract_orb_features(img: np.ndarray):
    """Extract ORB keypoints and descriptors"""
    orb = cv2.ORB_create(nfeatures=500)
    keypoints, descriptors = orb.detectAndCompute(img, None)
    return keypoints, descriptors

def match_descriptors(desc1: np.ndarray, desc2: np.ndarray) -> float:
    """Match two sets of ORB descriptors, return similarity score 0-1"""
    if desc1 is None or desc2 is None:
        return 0.0
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(desc1, desc2)
    if not matches:
        return 0.0
    matches = sorted(matches, key=lambda x: x.distance)
    good = [m for m in matches if m.distance < 50]
    score = len(good) / max(len(matches), 1)
    return min(score * 2, 1.0)
