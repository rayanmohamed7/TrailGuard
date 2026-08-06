import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.trails import trails_bp
from routes.auth import auth_bp

app = Flask(__name__)

# Set secret key for Flask session cookie encryption
app.secret_key = os.environ.get("SECRET_KEY", "trailguard-super-secret-key-123456")

# Enable Cross-Origin Resource Sharing (CORS) with support for credentials (sessions/cookies)
CORS(app, supports_credentials=True)

# Register blueprints under the '/api' prefix
app.register_blueprint(trails_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    GET /api/health
    Simple health check route to confirm the Flask server is running.
    """
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    # Run the server locally on localhost and configuration-defined port
    app.run(host='127.0.0.1', port=Config.PORT, debug=True)
