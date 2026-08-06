import datetime
from flask import Blueprint, jsonify, request, session
import bcrypt
from models.user import get_users_collection

# Create the auth blueprint
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    POST /api/register
    Accepts name, email, password, and emergency_contact as JSON.
    Hashes the password with bcrypt and stores the contact as an embedded subdocument.
    Registers the session and returns user info on success.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    emergency_contact = data.get('emergency_contact')
    
    # Input validation
    if not name or not name.strip():
        return jsonify({"error": "Full name is required"}), 400
    if not email or not email.strip():
        return jsonify({"error": "Email address is required"}), 400
    if not password or not password.strip():
        return jsonify({"error": "Password is required"}), 400
        
    if not emergency_contact:
        return jsonify({"error": "Emergency contact info is required"}), 400
        
    c_name = emergency_contact.get('name')
    c_phone = emergency_contact.get('phone')
    c_email = emergency_contact.get('email')
    
    if not c_name or not c_name.strip():
        return jsonify({"error": "Emergency contact name is required"}), 400
    if not c_phone or not c_phone.strip():
        return jsonify({"error": "Emergency contact phone number is required"}), 400
    if not c_email or not c_email.strip():
        return jsonify({"error": "Emergency contact email is required"}), 400

    users = get_users_collection()
    
    # Reject duplicate emails (case-insensitive check, clean error)
    clean_email = email.strip().lower()
    if users.find_one({"email": clean_email}):
        return jsonify({"error": "Email address is already registered"}), 400
        
    # Hash password with bcrypt before saving (never store plain text)
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    
    user_doc = {
        "name": name.strip(),
        "full_name": name.strip(), # Set both name and full_name for database compatibility
        "email": clean_email,
        "password_hash": password_hash,
        "emergency_contact": {
            "name": c_name.strip(),
            "phone": c_phone.strip(),
            "email": c_email.strip()
        },
        "created_at": datetime.datetime.now(datetime.timezone.utc)
    }
    
    try:
        result = users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        print(f"User created: {result.inserted_id}") # Flask terminal confirmation print
        
        # Log the user in by setting the session variable
        session['user_id'] = user_id
        
        return jsonify({
            "message": "Registration successful",
            "user": {
                "id": user_id,
                "name": user_doc["name"],
                "email": user_doc["email"],
                "emergency_contact": user_doc["emergency_contact"]
            }
        }), 201
    except Exception as e:
        print("Registration database insert error:", e)
        return jsonify({"error": "Failed to save user. Please try again."}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/login
    Accepts email and password. Checks credentials against bcrypt hash.
    Sets the session and returns user info on success.
    Returns generic 401 response on any invalid input.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
        
    users = get_users_collection()
    clean_email = email.strip().lower()
    user = users.find_one({"email": clean_email})
    
    # Generic error on invalid email
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401
        
    # Check password against hash (using bcrypt.checkpw, never compare plain text)
    password_bytes = password.encode('utf-8')
    hash_bytes = user['password_hash'].encode('utf-8')
    
    if not bcrypt.checkpw(password_bytes, hash_bytes):
        return jsonify({"error": "Invalid email or password"}), 401
        
    # Store the user ID in the Flask session on success
    session['user_id'] = str(user['_id'])
    
    return jsonify({
        "message": "Login successful",
        "user": {
            "id": str(user['_id']),
            "name": user['name'],
            "email": user['email'],
            "emergency_contact": user.get('emergency_contact')
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    POST /api/logout
    Clears the session to log out.
    """
    session.clear()
    return jsonify({"message": "Logout successful"}), 200

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """
    GET /api/me
    Retrieves the current user's profile if session is valid.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
        
    from bson.objectid import ObjectId
    users = get_users_collection()
    try:
        user = users.find_one({"_id": ObjectId(user_id)})
        if not user:
            session.clear()
            return jsonify({"error": "User session not found"}), 401
            
        return jsonify({
            "user": {
                "id": str(user['_id']),
                "name": user['name'],
                "email": user['email'],
                "emergency_contact": user.get('emergency_contact')
            }
        }), 200
    except Exception:
        session.clear()
        return jsonify({"error": "Invalid session data"}), 401
