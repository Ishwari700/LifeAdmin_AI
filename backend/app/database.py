import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
load_dotenv()
URL=os.getenv("DATABASE_URL","sqlite:///./lifeadmin.db")
engine=create_engine(URL,connect_args={"check_same_thread":False} if URL.startswith("sqlite") else {})
SessionLocal=sessionmaker(autocommit=False,autoflush=False,bind=engine)
class Base(DeclarativeBase): pass
def get_db():
    db=SessionLocal()
    try: yield db
    finally: db.close()
