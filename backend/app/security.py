import os
from datetime import datetime,timedelta
from jose import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
load_dotenv()
pwd=CryptContext(schemes=["bcrypt"],deprecated="auto")
SECRET=os.getenv("SECRET_KEY","dev-secret-change-me")
def hash_password(p): return pwd.hash(p)
def verify_password(p,h): return pwd.verify(p,h)
def create_token(uid): return jwt.encode({"sub":str(uid),"exp":datetime.utcnow()+timedelta(hours=12)},SECRET,algorithm="HS256")
def decode_token(t): return jwt.decode(t,SECRET,algorithms=["HS256"])
