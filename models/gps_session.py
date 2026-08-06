# TrailGuard GPS Session Model Schema:
# {
#   "_id": ObjectId,
#   "user_id": ObjectId (ref to users),
#   "trail_name": string,
#   "share_token": string,
#   "current_location": {"lat": number, "lng": number},
#   "location_history": [{"lat": number, "lng": number, "timestamp": datetime}],
#   "started_at": datetime,
#   "last_updated": datetime,
#   "is_active": boolean,
#   "expires_at": datetime (TTL index)
# }

from models.trail import get_db

def get_gps_sessions_collection():
    """
    Returns the gps_sessions collection from the database and ensures 
    the TTL index is created on the expires_at field.
    """
    db = get_db()
    # Create TTL index on expires_at. 
    # Specifying expireAfterSeconds=0 means documents expire at the exact timestamp specified in the expires_at field.
    db.gps_sessions.create_index("expires_at", expireAfterSeconds=0)
    # Ensure share_token has a unique lookup index
    db.gps_sessions.create_index("share_token", unique=True)
    return db.gps_sessions
