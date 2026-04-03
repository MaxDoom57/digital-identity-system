from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

from routes.fingerprint import fingerprint_bp
from routes.face import face_bp
from routes.liveness import liveness_bp
from routes.offline import offline_bp

app.register_blueprint(fingerprint_bp, url_prefix='/api/fingerprint')
app.register_blueprint(face_bp, url_prefix='/api/face')
app.register_blueprint(liveness_bp, url_prefix='/api/liveness')
app.register_blueprint(offline_bp, url_prefix='/api/offline')

@app.route('/health')
def health():
    return jsonify({'status': 'OK', 'service': 'Biometric Service'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
