import os
import shutil

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from dotenv import load_dotenv

from .database import Base, engine, get_db
from .models import User, StudentProfile, Scheme, Application
from .schemas import (
    RegisterIn,
    LoginIn,
    ProfileIn,
    PlanIn,
    ApplicationIn,
    ApplicationUpdate,
    SchemeIn,
    ChatIn,
)
from .security import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
)
from .seed import seed
from .rag import ingest, retrieve, generate


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LifeAdmin AI API",
    description="Maharashtra Scholarship Assistant",
    version="2.0.0",
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer(auto_error=False)


# --------------------------------------------------
# STARTUP
# --------------------------------------------------

@app.on_event("startup")
def startup():
    db = next(get_db())
    try:
        seed(db)
    finally:
        db.close()


# --------------------------------------------------
# AUTHENTICATION
# --------------------------------------------------

def current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not creds:
        raise HTTPException(status_code=401, detail="Sign in required")

    try:
        uid = int(decode_token(creds.credentials)["sub"])
    except (JWTError, ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter_by(id=uid).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def admin_user(user=Depends(current_user)):
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )
    return user


# --------------------------------------------------
# SERIALIZATION
# --------------------------------------------------

def sj(scheme):
    return {
        "id": scheme.id,
        "name": scheme.name,
        "description": scheme.description,
        "category": scheme.category,
        "max_income": scheme.max_income,
        "eligible_categories": scheme.eligible_categories,
        "eligible_courses": scheme.eligible_courses,
        "documents": scheme.documents,
        "steps": scheme.steps,
        "deadline": (
            scheme.deadline.isoformat()
            if scheme.deadline else None
        ),
        "source_name": scheme.source_name,
        "source_url": scheme.source_url,
        "verified_at": scheme.verified_at,
        "is_demo": scheme.is_demo,
    }


def application_json(application):
    return {
        "id": application.id,
        "scheme": sj(application.scheme),
        "status": application.status,
        "notes": application.notes,
    }


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "name": "LifeAdmin AI API",
        "docs": "/docs",
        "status": "Running",
    }


# --------------------------------------------------
# REGISTER
# --------------------------------------------------

@app.post("/api/auth/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter_by(email=data.email).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        is_admin=False,
    )

    try:
        db.add(user)
        db.flush()

        profile = StudentProfile(
            user_id=user.id,
            state="Maharashtra",
        )
        db.add(profile)
        db.commit()
        db.refresh(user)

        return {
            "token": create_token(user.id),
            "name": user.name,
            "email": user.email,
            "is_admin": bool(user.is_admin),
        }
    except Exception:
        db.rollback()
        raise


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@app.post("/api/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=data.email).first()

    if not user or not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    return {
        "token": create_token(user.id),
        "name": user.name,
        "email": user.email,
        "is_admin": bool(user.is_admin),
    }


# --------------------------------------------------
# STUDENT PROFILE
# --------------------------------------------------

@app.get("/api/profile")
def get_profile(
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter_by(
        user_id=user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    return {
        "name": user.name,
        "email": user.email,
        "is_admin": bool(user.is_admin),
        "state": profile.state,
        "district": profile.district,
        "course": profile.course,
        "year": profile.year,
        "category": profile.category,
        "annual_income": profile.annual_income,
        "institution": profile.institution,
    }


@app.put("/api/profile")
def put_profile(
    data: ProfileIn,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter_by(
        user_id=user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    for key, value in data.model_dump().items():
        setattr(profile, key, value)

    db.commit()

    return {"message": "Profile updated successfully"}


# --------------------------------------------------
# SCHOLARSHIP LIST
# --------------------------------------------------

@app.get("/api/schemes")
def get_schemes(db: Session = Depends(get_db)):
    schemes = db.query(Scheme).order_by(Scheme.id.desc()).all()
    return [sj(scheme) for scheme in schemes]


# --------------------------------------------------
# ADMIN: ADD, EDIT AND DELETE SCHOLARSHIPS
# --------------------------------------------------

@app.post("/api/admin/schemes")
def create_scheme(
    data: SchemeIn,
    admin=Depends(admin_user),
    db: Session = Depends(get_db),
):
    scheme = Scheme(**data.model_dump())
    db.add(scheme)
    db.commit()
    db.refresh(scheme)

    return {
        "message": "Scholarship created successfully",
        "scheme": sj(scheme),
    }


@app.put("/api/admin/schemes/{scheme_id}")
def edit_scheme(
    scheme_id: int,
    data: SchemeIn,
    admin=Depends(admin_user),
    db: Session = Depends(get_db),
):
    scheme = db.query(Scheme).filter_by(id=scheme_id).first()

    if not scheme:
        raise HTTPException(
            status_code=404,
            detail="Scholarship not found",
        )

    for key, value in data.model_dump().items():
        setattr(scheme, key, value)

    db.commit()
    db.refresh(scheme)

    return {
        "message": "Scholarship updated successfully",
        "scheme": sj(scheme),
    }


@app.delete("/api/admin/schemes/{scheme_id}")
def delete_scheme(
    scheme_id: int,
    admin=Depends(admin_user),
    db: Session = Depends(get_db),
):
    scheme = db.query(Scheme).filter_by(id=scheme_id).first()

    if not scheme:
        raise HTTPException(
            status_code=404,
            detail="Scholarship not found",
        )

    # Remove linked applications before deleting the scholarship.
    db.query(Application).filter_by(
        scheme_id=scheme_id
    ).delete(synchronize_session=False)

    db.delete(scheme)
    db.commit()

    return {
        "message": (
            "Scholarship and linked tracked applications deleted"
        )
    }


# --------------------------------------------------
# ELIGIBILITY CHECKER
# --------------------------------------------------

@app.post("/api/eligibility/check")
def check_eligibility(
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter_by(
        user_id=user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    results = []

    for scheme in db.query(Scheme).all():
        reasons = []
        missing = []

        eligible_courses = (scheme.eligible_courses or "").lower()
        eligible_categories = (scheme.eligible_categories or "").lower()

        if not profile.course:
            missing.append("course")
        elif (
            profile.course.lower() not in eligible_courses
            and "professional courses" not in eligible_courses
            and eligible_courses.strip() not in ("", "all")
        ):
            reasons.append(
                "Course may not match the listed course scope."
            )

        if not profile.category:
            missing.append("category")
        elif (
            profile.category.lower() not in eligible_categories
            and eligible_categories.strip() not in ("", "all")
        ):
            reasons.append(
                "Category is not listed in this scholarship record."
            )

        if profile.annual_income is None:
            missing.append("annual income")
        elif (
            scheme.max_income is not None
            and profile.annual_income > scheme.max_income
        ):
            reasons.append(
                "Income is above the listed maximum income."
            )

        if missing:
            status = "More information needed"
        elif reasons:
            status = "Not matched by available rules"
        else:
            status = "Potential match"

        results.append({
            "scheme": sj(scheme),
            "status": status,
            "reasons": reasons,
            "missing": missing,
            "notice": (
                "Preliminary screening only; verify current "
                "eligibility rules on the official source."
            ),
        })

    return results


# --------------------------------------------------
# SCHOLARSHIP-SPECIFIC AI ACTION PLAN
# --------------------------------------------------

@app.post("/api/assistant/plan")
def make_plan(
    data: PlanIn,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    scheme = db.query(Scheme).filter_by(
        id=data.scheme_id
    ).first()

    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    profile = db.query(StudentProfile).filter_by(
        user_id=user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
        )

    documents = [
        item.strip()
        for item in (scheme.documents or "").split(";")
        if item.strip()
    ]

    evidence = retrieve(db, data.question or scheme.name, limit=4)

    prompt = f"""
You are LifeAdmin AI, a Maharashtra Scholarship Assistant.

Use the supplied scholarship information and retrieved PDF evidence.
Never invent scholarship rules, dates, fees or procedures.
Clearly identify uncertainty and advise checking official notifications.

STUDENT PROFILE:
Course: {profile.course}
Academic Year: {profile.year}
Category: {profile.category}
Annual Income: {profile.annual_income}
District: {profile.district}
Institution: {profile.institution}

SCHOLARSHIP:
{scheme.name}

DESCRIPTION:
{scheme.description}

ELIGIBILITY:
Categories: {scheme.eligible_categories}
Courses: {scheme.eligible_courses}
Maximum income: {scheme.max_income}

DOCUMENTS:
{scheme.documents}

PROCEDURE:
{scheme.steps}

DEADLINE:
{scheme.deadline}

RETRIEVED PDF EVIDENCE:
{evidence}

USER QUESTION:
{data.question}

Return:
1. Preliminary eligibility assessment
2. Document checklist
3. Numbered application procedure
4. Details requiring verification
5. Official source
"""

    answer = generate(prompt)

    if not answer:
        answer = (
            f"Preliminary guidance — {scheme.name}\n\n"
            "The local AI model is unavailable. Here is the information "
            "stored in the scholarship record.\n\n"
            "Document checklist:\n"
            + "\n".join("- [ ] " + item for item in documents)
            + f"\n\nProcedure:\n{scheme.steps or 'Not provided.'}"
            + f"\n\nOfficial source: {scheme.source_name} "
            f"— {scheme.source_url}"
            + f"\nRelevant PDF chunks retrieved: {len(evidence)}."
        )

    return {
        "scheme": sj(scheme),
        "answer": answer,
        "documents": documents,
        "steps": scheme.steps,
        "evidence": evidence,
        "disclaimer": (
            "AI guidance may be incomplete. Verify every requirement "
            "on the official source before applying."
        ),
    }


# --------------------------------------------------
# GENERAL AI CHATBOT
# --------------------------------------------------

@app.post("/api/assistant/chat")
def assistant_chat(
    data: ChatIn,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter_by(
        user_id=user.id
    ).first()

    schemes = db.query(Scheme).all()
    evidence = retrieve(db, data.question, limit=5)

    profile_context = "Profile not available."
    if profile:
        profile_context = f"""
State: {profile.state}
District: {profile.district}
Course: {profile.course}
Academic Year: {profile.year}
Category: {profile.category}
Annual Income: {profile.annual_income}
Institution: {profile.institution}
"""

    scheme_context = "\n\n".join(
        f"""
Scholarship: {scheme.name}
Description: {scheme.description}
Category: {scheme.category}
Maximum income: {scheme.max_income}
Eligible categories: {scheme.eligible_categories}
Eligible courses: {scheme.eligible_courses}
Documents: {scheme.documents}
Application steps: {scheme.steps}
Deadline: {scheme.deadline}
Official source: {scheme.source_name} - {scheme.source_url}
"""
        for scheme in schemes
    ) or "No scholarship records are currently available."

    prompt = f"""
You are LifeAdmin AI, a helpful Maharashtra Scholarship Assistant.

Answer the student's question in simple, clear language.

RULES:
- Use the supplied scholarship records and retrieved PDF evidence.
- Do not invent eligibility rules, deadlines, fees, schemes or links.
- If the supplied information does not answer the question, say so.
- Distinguish general guidance from confirmed official requirements.
- Encourage students to verify current details on official websites.
- Never claim that you submitted an application or contacted an authority.
- Use bullet points or numbered steps when useful.

STUDENT:
{user.name}

STUDENT PROFILE:
{profile_context}

AVAILABLE SCHOLARSHIPS:
{scheme_context}

RETRIEVED PDF EVIDENCE:
{evidence}

STUDENT QUESTION:
{data.question}
"""

    answer = generate(prompt)

    if not answer:
        answer = (
            "I could not connect to the local AI model. Please check that "
            "Ollama is running and that the configured model is installed. "
            "You can still browse the scholarship records in the dashboard."
        )

    return {
        "question": data.question,
        "answer": answer,
        "evidence": evidence,
        "disclaimer": (
            "AI-generated guidance is preliminary. Confirm current "
            "requirements with the official scholarship authority."
        ),
    }


# --------------------------------------------------
# SCHOLARSHIP DEADLINES
# --------------------------------------------------

@app.get("/api/deadlines")
def deadlines(
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    schemes = db.query(Scheme).all()

    return [
        {
            "id": scheme.id,
            "name": scheme.name,
            "deadline": (
                scheme.deadline.isoformat()
                if scheme.deadline else None
            ),
            "source_url": scheme.source_url,
        }
        for scheme in schemes
    ]


# --------------------------------------------------
# STUDENT APPLICATIONS
# --------------------------------------------------

@app.get("/api/applications")
def applications(
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    records = db.query(Application).filter_by(
        user_id=user.id
    ).all()

    return [application_json(record) for record in records]


@app.post("/api/applications")
def add_application(
    data: ApplicationIn,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    scheme = db.query(Scheme).filter_by(
        id=data.scheme_id
    ).first()

    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    existing = db.query(Application).filter_by(
        user_id=user.id,
        scheme_id=data.scheme_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This scholarship is already in your tracked applications",
        )

    application = Application(
        user_id=user.id,
        scheme_id=data.scheme_id,
        status=data.status,
        notes=data.notes,
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return {
        "id": application.id,
        "status": application.status,
    }


@app.patch("/api/applications/{aid}")
def update_application(
    aid: int,
    data: ApplicationUpdate,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    application = db.query(Application).filter_by(
        id=aid,
        user_id=user.id,
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    application.status = data.status

    if data.notes is not None:
        application.notes = data.notes

    db.commit()

    return {"message": "Progress updated successfully"}


@app.delete("/api/applications/{aid}")
def delete_application(
    aid: int,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    application = db.query(Application).filter_by(
        id=aid,
        user_id=user.id,
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    db.delete(application)
    db.commit()

    return {"message": "Application removed successfully"}


# --------------------------------------------------
# ADMIN: PDF UPLOAD AND RAG INDEXING
# --------------------------------------------------

@app.post("/api/admin/upload-pdf")
def upload_pdf(
    file: UploadFile = File(...),
    admin=Depends(admin_user),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files accepted",
        )

    upload_dir = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "data",
            "uploads",
        )
    )
    os.makedirs(upload_dir, exist_ok=True)

    filename = os.path.basename(file.filename)
    path = os.path.join(upload_dir, filename)

    try:
        with open(path, "wb") as output_file:
            shutil.copyfileobj(file.file, output_file)

        count = ingest(db, filename, path)

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Could not read or index PDF: {error}",
        )
    finally:
        file.file.close()

    return {
        "filename": filename,
        "chunks_indexed": count,
        "message": "PDF indexed successfully",
    }
