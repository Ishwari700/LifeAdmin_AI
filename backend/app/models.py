from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Text,
    ForeignKey,
    Date,
    DateTime,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(180), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    state = Column(String(80), default="Maharashtra")
    district = Column(String(100), default="")
    course = Column(String(120), default="")
    year = Column(Integer, nullable=True)
    category = Column(String(80), default="")
    annual_income = Column(Integer, nullable=True)
    institution = Column(String(180), default="")


class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(Integer, primary_key=True)
    name = Column(String(220), nullable=False)
    description = Column(Text, default="")
    category = Column(String(100), default="")
    max_income = Column(Integer, nullable=True)
    eligible_categories = Column(String(500), default="")
    eligible_courses = Column(String(500), default="")
    documents = Column(Text, default="")
    steps = Column(Text, default="")
    deadline = Column(Date, nullable=True)
    source_name = Column(String(220), default="")
    source_url = Column(String(500), default="")
    verified_at = Column(String(80), default="Not verified")
    is_demo = Column(Boolean, default=True)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=False)
    status = Column(String(40), default="Not started")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    scheme = relationship("Scheme")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
