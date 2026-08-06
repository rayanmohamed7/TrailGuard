from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.trails import trails_bp

app = Flask(__name__)

# Enable Cross-Origin Resource Sharing (CORS) so that frontend HTML pages opened via file:// 
# can query the API server during development.
CORS(app)

# Register the trails blueprint under the '/api' prefix
app.register_blueprint(trails_bp, url_prefix='/api')

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
