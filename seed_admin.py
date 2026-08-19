# seed_admin.py
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.core.database import SessionLocal
from src.models.users import User
from src.core.security import hash_password

def create_admin():
    db = SessionLocal()
    
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            print("Admin already exists!")
            return
        
        admin = User(
            first_name="Admin",
            last_name="User",
            username="admin",
            email_address="admin@esaka.gov.ph",
            phone_number="09123456789",
            password=hash_password("SecurePassword123!"),
            role="System Administrator"
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("=" * 50)
        print("Admin Created!")
        print(f"   Username: {admin.username}")
        print(f"   Password: SecurePassword123!")
        print(f"   Role: {admin.role}")
        print("=" * 50)
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()