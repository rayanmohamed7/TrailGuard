# TrailGuard Trail Model Schema:
# {
#   "_id": ObjectId,
#   "name": string,
#   "difficulty": string ("easy" | "moderate" | "hard"),
#   "distance_km": number,
#   "elevation_m": number,
#   "location": string,
#   "waterfall_safety_status": string,
#   "swimming_warning": boolean,
#   "description": string,
#   "image_url": string,
#   "duration_hours": number,
#   "gear_needed": array of strings,
#   "best_season": string,
#   "guide_required": boolean,
#   "starting_point": string,
#   "permit_required": boolean,
#   "fitness_level": string ("beginner" | "intermediate" | "advanced")
# }

from pymongo import MongoClient
from bson.objectid import ObjectId
from config import Config

# Shared MongoDB client instance
_client = None

def get_db():
    """Returns a connection to the MongoDB database."""
    global _client
    if _client is None:
        _client = MongoClient(Config.MONGO_URI)
    return _client[Config.MONGO_DB_NAME]

def get_trails_collection():
    """Returns the trails collection from the database."""
    return get_db().trails

def serialize_trail(trail):
    """Converts the MongoDB ObjectId to a string representation for JSON output."""
    if not trail:
        return None
    trail['_id'] = str(trail['_id'])
    return trail

class TrailModel:
    @staticmethod
    def get_all(difficulty=None, search=None):
        """
        Retrieves all trails from the database.
        Optionally filters by difficulty (exact match) and/or search term (case-insensitive partial name match).
        """
        collection = get_trails_collection()
        query = {}
        
        # Apply difficulty filter
        if difficulty:
            query['difficulty'] = difficulty.lower()
            
        # Apply search query filter (case-insensitive regex match on trail name)
        if search:
            query['name'] = {'$regex': search, '$options': 'i'}
            
        cursor = collection.find(query)
        return [serialize_trail(t) for t in cursor]

    @staticmethod
    def get_by_id(trail_id):
        """Retrieves a single trail by its hexadecimal ObjectId string."""
        collection = get_trails_collection()
        try:
            doc = collection.find_one({"_id": ObjectId(trail_id)})
            return serialize_trail(doc)
        except Exception:
            # Handle invalid ObjectId strings gracefully
            return None
