from flask import Blueprint, jsonify, request
from models.trail import TrailModel

# Create the trails blueprint
trails_bp = Blueprint('trails', __name__)

@trails_bp.route('/trails', methods=['GET'])
def get_trails():
    """
    GET /api/trails
    Returns a list of all trails.
    Supports optional query parameters:
      - 'difficulty': filters by easy, moderate, or hard
      - 'search': case-insensitive partial match on the trail name
    """
    difficulty = request.args.get('difficulty')
    search = request.args.get('search')
    
    # Query database using the model
    trails = TrailModel.get_all(difficulty=difficulty, search=search)
    return jsonify(trails), 200

@trails_bp.route('/trails/<trail_id>', methods=['GET'])
def get_trail_by_id(trail_id):
    """
    GET /api/trails/<trail_id>
    Returns the details of a single trail by its ObjectId.
    If the trail does not exist or the ID is invalid, returns a 404 error.
    """
    trail = TrailModel.get_by_id(trail_id)
    if not trail:
        return jsonify({"error": "Trail not found"}), 404
    
    return jsonify(trail), 200
