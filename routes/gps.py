import datetime
import secrets
from flask import Blueprint, jsonify, request, session
from bson.objectid import ObjectId
from models.gps_session import get_gps_sessions_collection

gps_bp = Blueprint('gps', __name__)

def check_login():
    """Helper to check if a user is authenticated."""
    return session.get('user_id')

@gps_bp.route('/start', methods=['POST'])
def start_session():
    """
    POST /api/gps/start
    Accepts trail_name as JSON. Generates share_token, sets session active.
    Returns session ID, share_token, and full shareable URL.
    """
    user_id = check_login()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json() or {}
    trail_name = data.get('trail_name')
    if not trail_name:
        return jsonify({"error": "Trail name is required"}), 400

    share_token = secrets.token_urlsafe(16)
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = now + datetime.timedelta(hours=24)

    gps_sessions = get_gps_sessions_collection()

    session_doc = {
        "user_id": ObjectId(user_id),
        "trail_name": trail_name,
        "share_token": share_token,
        "current_location": None,
        "location_history": [],
        "started_at": now,
        "last_updated": now,
        "is_active": True,
        "expires_at": expires_at
    }

    try:
        result = gps_sessions.insert_one(session_doc)
        session_id = str(result.inserted_id)

        # Dynamic reconstruction of shareable URL based on referrer
        referrer = request.referrer
        if referrer:
            if "tracking.html" in referrer:
                share_url = referrer.replace("tracking.html", f"track-view.html?token={share_token}")
            else:
                share_url = f"{referrer.rstrip('/')}/track-view.html?token={share_token}"
        else:
            share_url = f"http://127.0.0.1:5500/app/auth/track-view.html?token={share_token}"

        return jsonify({
            "message": "Tracking session started",
            "session_id": session_id,
            "share_token": share_token,
            "share_url": share_url
        }), 201
    except Exception as e:
        print("Error starting GPS session:", e)
        return jsonify({"error": "Failed to create tracking session"}), 500

@gps_bp.route('/update/<session_id>', methods=['POST'])
def update_location(session_id):
    """
    POST /api/gps/update/<session_id>
    Accepts latitude and longitude. Appends to history and updates current location.
    Requires caller to be the session owner.
    """
    user_id = check_login()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json() or {}
    lat = data.get('lat')
    lng = data.get('lng')

    if lat is None or lng is None:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    gps_sessions = get_gps_sessions_collection()
    try:
        # Find active session and verify owner
        sess = gps_sessions.find_one({"_id": ObjectId(session_id)})
        if not sess:
            return jsonify({"error": "Session not found"}), 404
        if str(sess['user_id']) != user_id:
            return jsonify({"error": "Unauthorized session modification"}), 403
        if not sess['is_active']:
            return jsonify({"error": "Session is inactive"}), 400

        now = datetime.datetime.now(datetime.timezone.utc)
        expires_at = now + datetime.timedelta(hours=24)

        location_update = {
            "lat": float(lat),
            "lng": float(lng),
            "timestamp": now
        }

        gps_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$set": {
                    "current_location": {"lat": float(lat), "lng": float(lng)},
                    "last_updated": now,
                    "expires_at": expires_at
                },
                "$push": {
                    "location_history": location_update
                }
            }
        )

        return jsonify({"message": "Location updated successfully"}), 200
    except Exception as e:
        print("Error updating GPS location:", e)
        return jsonify({"error": "Internal server error"}), 500

@gps_bp.route('/stop/<session_id>', methods=['POST'])
def stop_session(session_id):
    """
    POST /api/gps/stop/<session_id>
    Deactivates a session.
    Requires caller to be the session owner.
    """
    user_id = check_login()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    gps_sessions = get_gps_sessions_collection()
    try:
        sess = gps_sessions.find_one({"_id": ObjectId(session_id)})
        if not sess:
            return jsonify({"error": "Session not found"}), 404
        if str(sess['user_id']) != user_id:
            return jsonify({"error": "Unauthorized session modification"}), 403

        now = datetime.datetime.now(datetime.timezone.utc)
        # Session stopped - set expiration to 24 hours from now
        expires_at = now + datetime.timedelta(hours=24)

        gps_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$set": {
                    "is_active": False,
                    "last_updated": now,
                    "expires_at": expires_at
                }
            }
        )

        return jsonify({"message": "Tracking session stopped"}), 200
    except Exception as e:
        print("Error stopping GPS session:", e)
        return jsonify({"error": "Internal server error"}), 500

@gps_bp.route('/track/<share_token>', methods=['GET'])
def get_track_data(share_token):
    """
    GET /api/gps/track/<share_token>
    PUBLIC endpoint. Returns current location, history, and status for token.
    """
    gps_sessions = get_gps_sessions_collection()
    try:
        sess = gps_sessions.find_one({"share_token": share_token})
        if not sess:
            return jsonify({"error": "Tracking link invalid or expired"}), 404

        # Convert timestamps in location history for JSON serialization
        history = []
        for loc in sess.get('location_history', []):
            history.append({
                "lat": loc['lat'],
                "lng": loc['lng'],
                "timestamp": loc['timestamp'].isoformat()
            })

        return jsonify({
            "trail_name": sess['trail_name'],
            "current_location": sess['current_location'],
            "location_history": history,
            "is_active": sess['is_active'],
            "last_updated": sess['last_updated'].isoformat()
        }), 200
    except Exception as e:
        print("Error reading tracking data:", e)
        return jsonify({"error": "Internal server error"}), 500
