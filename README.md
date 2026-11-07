# LifeAdmin AI — Maharashtra Scholarship Assistant

Academic prototype: a scholarship-focused Procedure Intelligence chatbot.

## Included
- Student registration/login with JWT
- Student profile management
- Maharashtra scholarship seed catalogue (illustrative, verify current rules)
- Preliminary eligibility checker with missing fields/reasons
- Personalized document checklist and application procedure
- Application progress tracker and deadline view
- Official source links
- Admin-only PDF upload, PDF text extraction and TF-IDF retrieval
- Optional local Ollama generation; grounded fallback when Ollama is offline

## Stack
FastAPI + SQLite + SQLAlchemy + React/Vite + local PDF RAG + optional Ollama.

## Run on Windows
Backend:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Frontend (new terminal):
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. API docs: http://127.0.0.1:8000/docs

## Optional Ollama
Install Ollama, then run `ollama pull llama3.2:3b`. Set `OLLAMA_MODEL=llama3.2:3b` in `backend/.env`.

## Enable admin upload
After registering, set your account as admin in the SQLite database:
```sql
UPDATE users SET is_admin = 1 WHERE email = 'your-email@example.com';
```
Then sign out/in and use Admin PDF Upload.

## Important
Seed scholarship entries are illustrative starter records, not confirmed current benefits, deadlines or eligibility determinations. Verify all rules against the current official notification at the linked official portal. This is not an official government service. Before production, add PostgreSQL, HTTPS, secure secrets, rate limits, upload malware scanning, audit logs, stronger admin management, and human review of conflicting/outdated rules.
