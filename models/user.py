# TrailGuard User Model Schema:
# {
#   "_id": ObjectId,
#   "name": string,
#   "email": string (unique index),
#   "password_hash": string (bcrypt),
#   "emergency_contact": {
#     "name": string,
#     "phone": string,
#     "email": string
#   },
#   "created_at": datetime
# }

from models.trail import get_db

def get_users_collection():
    """
    Returns the users collection from the database and ensures 
    the unique index on the email field is created.
    """
    db = get_db()
    # Create a unique index on the email field for fast, unique lookups
    db.users.create_index("email", unique=True)
    return db.users
