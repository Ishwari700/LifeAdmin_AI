from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileIn(BaseModel):
    state: str = "Maharashtra"
    district: str = ""
    course: str = ""
    # Academic year is restricted to a sensible positive range.
    year: Optional[int] = Field(default=None, ge=1, le=10)
    category: str = ""
    annual_income: Optional[int] = Field(default=None, ge=0)
    institution: str = ""


class PlanIn(BaseModel):
    scheme_id: int
    question: str = ""


class ChatIn(BaseModel):
    question: str = Field(min_length=2, max_length=2000)


class SchemeIn(BaseModel):
    name: str = Field(min_length=2, max_length=220)
    description: str = ""
    category: str = ""
    max_income: Optional[int] = Field(default=None, ge=0)
    eligible_categories: str = ""
    eligible_courses: str = ""
    documents: str = ""
    steps: str = ""
    deadline: Optional[date] = None
    source_name: str = ""
    source_url: str = ""
    verified_at: str = "Not verified"
    is_demo: bool = False


class ApplicationIn(BaseModel):
    scheme_id: int
    status: str = "Not started"
    notes: str = ""


class ApplicationUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
