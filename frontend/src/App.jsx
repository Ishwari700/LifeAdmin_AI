import React, { useEffect, useState } from "react";
import "./style.css";

const API = "http://127.0.0.1:8000/api";

async function request(endpoint, method = "GET", data = null, token = "") {
  const headers = {};

  if (data !== null) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${endpoint}`, {
    method,
    headers,
    ...(data !== null ? { body: JSON.stringify(data) } : {}),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.detail || `Request failed (${response.status})`);
  }

  return result;
}

function emptySchemeForm() {
  return {
    name: "",
    description: "",
    category: "",
    max_income: "",
    eligible_categories: "",
    eligible_courses: "",
    documents: "",
    steps: "",
    deadline: "",
    source_name: "",
    source_url: "",
    verified_at: "Not verified",
    is_demo: false,
  };
}

function Card({ scheme, onPlan, onTrack, isAdmin, onEdit, onDelete }) {
  return (
    <section className="panel">
      <small>
        {scheme.category || "Scholarship"} ·{" "}
        {scheme.verified_at || "Verification date unavailable"}
      </small>

      <h3>{scheme.name}</h3>
      <p>{scheme.description}</p>

      {scheme.max_income !== null && scheme.max_income !== undefined && (
        <p>Maximum annual income: ₹{Number(scheme.max_income).toLocaleString("en-IN")}</p>
      )}

      <span className="pill">Verify official details</span>

      {scheme.source_url && (
        <p>
          <a href={scheme.source_url} target="_blank" rel="noopener noreferrer">
            {scheme.source_name || "Official source"} ↗
          </a>
        </p>
      )}

      <button onClick={() => onPlan(scheme)}>Build Action Plan</button>
      <button className="light" onClick={() => onTrack(scheme)}>
        ＋ Track
      </button>

      {isAdmin && (
        <div className="admin-card-actions">
          <button className="light" onClick={() => onEdit(scheme)}>
            Edit
          </button>
          <button className="light" onClick={() => onDelete(scheme.id)}>
            Delete
          </button>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [token, setToken] = useState(
    localStorage.getItem("lifeadmin_token") || ""
  );
  const [mode, setMode] = useState("login");
  const [auth, setAuth] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [tab, setTab] = useState("overview");
  const [profile, setProfile] = useState({
    state: "Maharashtra",
    district: "",
    course: "",
    year: "",
    category: "",
    annual_income: "",
    institution: "",
  });

  const [schemes, setSchemes] = useState([]);
  const [eligibility, setEligibility] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);

  const [question, setQuestion] = useState("");
  const [plan, setPlan] = useState(null);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  const [schemeForm, setSchemeForm] = useState(emptySchemeForm());
  const [editingScheme, setEditingScheme] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("");

  function handleError(error) {
    setMessage(error.message || "Something went wrong");
  }

  // ------------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------------

  async function authenticate(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await request(
        mode === "login" ? "/auth/login" : "/auth/register",
        "POST",
        auth
      );

      localStorage.setItem("lifeadmin_token", result.token);
      setToken(result.token);
      setUserName(result.name || "");
      setIsAdmin(Boolean(result.is_admin));
      setMessage("Authentication successful!");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard() {
    if (!token) return;

    setLoading(true);

    try {
      const [profileResult, schemeResult, applicationResult] =
        await Promise.all([
          request("/profile", "GET", null, token),
          request("/schemes", "GET", null, token),
          request("/applications", "GET", null, token),
        ]);

      setProfile({
        state: profileResult.state || "Maharashtra",
        district: profileResult.district || "",
        course: profileResult.course || "",
        year: profileResult.year ?? "",
        category: profileResult.category || "",
        annual_income: profileResult.annual_income ?? "",
        institution: profileResult.institution || "",
      });

      setUserName(profileResult.name || "");
      setIsAdmin(Boolean(profileResult.is_admin));
      setSchemes(schemeResult);
      setApplications(applicationResult);
    } catch (error) {
      if (
        error.message.includes("Sign in") ||
        error.message.includes("Invalid") ||
        error.message.includes("expired")
      ) {
        logout();
      } else {
        handleError(error);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadDashboard();
    // Token change should trigger the initial dashboard load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function logout() {
    localStorage.removeItem("lifeadmin_token");
    setToken("");
    setUserName("");
    setIsAdmin(false);
    setSchemes([]);
    setApplications([]);
    setEligibility([]);
    setPlan(null);
    setChatMessages([]);
    setTab("overview");
    setMessage("");
  }

  // ------------------------------------------------
  // PROFILE
  // ------------------------------------------------

  async function saveProfile(event) {
    event.preventDefault();

    const year = profile.year === "" ? null : Number(profile.year);
    const income =
      profile.annual_income === "" ? null : Number(profile.annual_income);

    if (year !== null && (!Number.isInteger(year) || year < 1 || year > 10)) {
      setMessage("Academic year must be a whole number between 1 and 10.");
      return;
    }

    if (income !== null && (!Number.isInteger(income) || income < 0)) {
      setMessage("Annual income cannot be negative.");
      return;
    }

    setLoading(true);

    try {
      await request(
        "/profile",
        "PUT",
        {
          ...profile,
          year,
          annual_income: income,
        },
        token
      );

      setMessage("Profile updated successfully!");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------
  // ELIGIBILITY
  // ------------------------------------------------

  async function checkEligibility() {
    setLoading(true);
    setMessage("");

    try {
      const result = await request(
        "/eligibility/check",
        "POST",
        {},
        token
      );
      setEligibility(result);
      setTab("eligibility");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------
  // AI ACTION PLAN
  // ------------------------------------------------

  async function generatePlan(scheme) {
    setSelectedScheme(scheme);
    setLoading(true);
    setPlan(null);

    try {
      const result = await request(
        "/assistant/plan",
        "POST",
        {
          scheme_id: scheme.id,
          question: question.trim() || `Explain how to apply for ${scheme.name}`,
        },
        token
      );

      setPlan(result);
      setTab("assistant");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------
  // GENERAL AI CHATBOT
  // ------------------------------------------------

  async function sendChat(event) {
    if (event) event.preventDefault();

    const text = chatQuestion.trim();
    if (!text || loading) return;

    setChatMessages((previous) => [
      ...previous,
      { role: "user", text },
    ]);
    setChatQuestion("");
    setLoading(true);

    try {
      const result = await request(
        "/assistant/chat",
        "POST",
        { question: text },
        token
      );

      setChatMessages((previous) => [
        ...previous,
        { role: "assistant", text: result.answer || "No answer was returned." },
      ]);
    } catch (error) {
      setChatMessages((previous) => [
        ...previous,
        { role: "assistant", text: `Error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------
  // TRACKED APPLICATIONS
  // ------------------------------------------------

  async function trackScheme(scheme) {
    setLoading(true);

    try {
      await request(
        "/applications",
        "POST",
        {
          scheme_id: scheme.id,
          status: "Interested",
          notes: "Added from scholarship dashboard",
        },
        token
      );

      const updated = await request("/applications", "GET", null, token);
      setApplications(updated);
      setMessage("Scholarship added to your tracked applications!");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  async function updateApplication(id, status) {
    try {
      await request(
        `/applications/${id}`,
        "PATCH",
        { status },
        token
      );

      const updated = await request("/applications", "GET", null, token);
      setApplications(updated);
      setMessage("Application progress updated!");
    } catch (error) {
      handleError(error);
    }
  }

  async function removeApplication(id) {
    const confirmed = window.confirm("Remove this tracked application?");
    if (!confirmed) return;

    try {
      await request(`/applications/${id}`, "DELETE", null, token);
      setApplications((previous) =>
        previous.filter((application) => application.id !== id)
      );
      setMessage("Application removed successfully!");
    } catch (error) {
      handleError(error);
    }
  }

  // ------------------------------------------------
  // ADMIN: SCHOLARSHIP MANAGEMENT
  // ------------------------------------------------

  function startEditingScheme(scheme) {
    setEditingScheme(scheme.id);
    setSchemeForm({
      name: scheme.name || "",
      description: scheme.description || "",
      category: scheme.category || "",
      max_income: scheme.max_income ?? "",
      eligible_categories: scheme.eligible_categories || "",
      eligible_courses: scheme.eligible_courses || "",
      documents: scheme.documents || "",
      steps: scheme.steps || "",
      deadline: scheme.deadline || "",
      source_name: scheme.source_name || "",
      source_url: scheme.source_url || "",
      verified_at: scheme.verified_at || "Not verified",
      is_demo: Boolean(scheme.is_demo),
    });
    setTab("admin");
    setMessage("");
  }

  async function saveScheme(event) {
    event.preventDefault();

    if (!isAdmin) {
      setMessage("Admin access is required.");
      return;
    }

    const maxIncome =
      schemeForm.max_income === "" ? null : Number(schemeForm.max_income);

    if (
      maxIncome !== null &&
      (!Number.isInteger(maxIncome) || maxIncome < 0)
    ) {
      setMessage("Maximum income must be a non-negative whole number.");
      return;
    }

    const payload = {
      ...schemeForm,
      max_income: maxIncome,
      deadline: schemeForm.deadline || null,
    };

    setLoading(true);

    try {
      const endpoint = editingScheme
        ? `/admin/schemes/${editingScheme}`
        : "/admin/schemes";
      const method = editingScheme ? "PUT" : "POST";

      await request(endpoint, method, payload, token);

      const updated = await request("/schemes", "GET", null, token);
      setSchemes(updated);
      setSchemeForm(emptySchemeForm());
      setEditingScheme(null);
      setMessage(
        editingScheme
          ? "Scholarship updated successfully!"
          : "Scholarship added successfully!"
      );
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  async function removeScheme(id) {
    const confirmed = window.confirm(
      "Delete this scholarship? All tracked applications linked to it will also be deleted."
    );
    if (!confirmed) return;

    try {
      await request(`/admin/schemes/${id}`, "DELETE", null, token);

      setSchemes((previous) => previous.filter((scheme) => scheme.id !== id));
      setApplications((previous) =>
        previous.filter((application) => application.scheme.id !== id)
      );
      setMessage("Scholarship deleted successfully!");
    } catch (error) {
      handleError(error);
    }
  }

  async function uploadPdf(event) {
    event.preventDefault();

    if (!pdfFile) {
      setMessage("Please select a PDF file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", pdfFile);

    try {
      setLoading(true);

      const response = await fetch(`${API}/admin/upload-pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail || "PDF upload failed");
      }

      setMessage(
        `PDF indexed successfully. ${result.chunks_indexed} text chunks added.`
      );
      setPdfFile(null);
      event.target.reset();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------
  // LOGIN / REGISTER SCREEN
  // ------------------------------------------------

  if (!token) {
    return (
      <div className="auth">
        <form onSubmit={authenticate}>
          <div className="logo">
            LifeAdmin<span> AI</span>
          </div>

          <h1>{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
          <p>Your personal life administration assistant.</p>

          {mode === "register" && (
            <input
              placeholder="Full Name"
              required
              minLength={2}
              value={auth.name}
              onChange={(event) =>
                setAuth({ ...auth, name: event.target.value })
              }
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            required
            value={auth.email}
            onChange={(event) =>
              setAuth({ ...auth, email: event.target.value })
            }
          />

          <input
            type="password"
            placeholder="Password (minimum 6 characters)"
            required
            minLength={6}
            value={auth.password}
            onChange={(event) =>
              setAuth({ ...auth, password: event.target.value })
            }
          />

          {message && <div className="notice">{message}</div>}

          <button disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Register"}
          </button>

          <p>
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <a
              href="#auth-mode"
              onClick={(event) => {
                event.preventDefault();
                setMode(mode === "login" ? "register" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? "Register" : "Login"}
            </a>
          </p>
        </form>
      </div>
    );
  }

  // ------------------------------------------------
  // DASHBOARD
  // ------------------------------------------------

  const navigation = [
    ["overview", "Dashboard"],
    ["scholarships", "Scholarships"],
    ["eligibility", "Eligibility Checker"],
    ["assistant", "AI Assistant"],
    ["profile", "My Profile"],
    ["applications", "My Applications"],
    ...(isAdmin ? [["admin", "Admin Panel"]] : []),
  ];

  return (
    <div className="layout">
      <aside>
        <div className="logo">
          LifeAdmin<span> AI</span>
        </div>

        {navigation.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}

        <button onClick={logout}>Logout</button>
      </aside>

      <main>
        <small>MAHARASHTRA SCHOLARSHIP ASSISTANT</small>

        <h1>
          {tab === "overview" && `Welcome, ${userName}`}
          {tab === "scholarships" && "Scholarship Opportunities"}
          {tab === "eligibility" && "Eligibility Checker"}
          {tab === "assistant" && "LifeAdmin AI Assistant"}
          {tab === "profile" && "Student Profile"}
          {tab === "applications" && "My Applications"}
          {tab === "admin" && "Admin Panel"}
        </h1>

        {message && <div className="notice">{message}</div>}
        {loading && <p>Loading...</p>}

        {/* DASHBOARD OVERVIEW */}
        {tab === "overview" && (
          <>
            <section className="hero">
              <h2>Manage your opportunities.</h2>
              <p>
                Discover scholarships, check your eligibility, organize
                documents and track applications.
              </p>
              <button onClick={() => setTab("scholarships")}>
                Explore Scholarships
              </button>
            </section>

            <div className="stats">
              <article>
                <b>{schemes.length}</b>
                <p>Available Scholarships</p>
              </article>
              <article>
                <b>{applications.length}</b>
                <p>Tracked Applications</p>
              </article>
              <article>
                <b>{eligibility.length}</b>
                <p>Eligibility Results</p>
              </article>
            </div>

            <section className="panel">
              <h3>Quick Actions</h3>
              <button onClick={checkEligibility}>Check My Eligibility</button>
              <button className="light" onClick={() => setTab("profile")}>
                Update Profile
              </button>
              <button
                className="light"
                onClick={() => setTab("applications")}
              >
                Track Applications
              </button>
              <button className="light" onClick={() => setTab("assistant")}>
                Ask LifeAdmin AI
              </button>
            </section>
          </>
        )}

        {/* SCHOLARSHIPS */}
        {tab === "scholarships" && (
          <>
            <p>Scholarships retrieved from your backend database.</p>

            <div className="grid">
              {schemes.map((scheme) => (
                <Card
                  key={scheme.id}
                  scheme={scheme}
                  onPlan={generatePlan}
                  onTrack={trackScheme}
                  isAdmin={isAdmin}
                  onEdit={startEditingScheme}
                  onDelete={removeScheme}
                />
              ))}
            </div>

            {schemes.length === 0 && !loading && (
              <section className="panel">
                No scholarships found. Check your backend seed data.
              </section>
            )}
          </>
        )}

        {/* ELIGIBILITY */}
        {tab === "eligibility" && (
          <>
            <button onClick={checkEligibility}>Check Eligibility Again</button>

            {eligibility.map((item, index) => (
              <section className="panel" key={item.scheme.id || index}>
                <h3>{item.scheme.name}</h3>
                <span className="pill">{item.status}</span>

                {item.reasons?.map((reason, i) => (
                  <p key={`reason-${i}`}>⚠ {reason}</p>
                ))}

                {item.missing?.map((missing, i) => (
                  <p key={`missing-${i}`}>Missing information: {missing}</p>
                ))}

                <p>{item.notice}</p>
                <button onClick={() => generatePlan(item.scheme)}>
                  Generate Action Plan
                </button>
              </section>
            ))}

            {eligibility.length === 0 && !loading && (
              <p>Click Check Eligibility to get your results.</p>
            )}
          </>
        )}

        {/* AI CHATBOT AND ACTION PLAN */}
        {tab === "assistant" && (
          <>
            <section className="panel">
              <h3>LifeAdmin AI Chatbot</h3>
              <p>
                Ask general questions about scholarships, eligibility,
                required documents and application procedures.
              </p>

              <div className="chat-box">
                {chatMessages.length === 0 && (
                  <p>
                    Start by asking something like: "Which documents are
                    usually needed for a Maharashtra scholarship?"
                  </p>
                )}

                {chatMessages.map((chat, index) => (
                  <div
                    key={index}
                    className={`panel ${
                      chat.role === "user" ? "user-message" : ""
                    }`}
                  >
                    <b>{chat.role === "user" ? "You" : "LifeAdmin AI"}</b>
                    <p style={{ whiteSpace: "pre-wrap" }}>{chat.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendChat}>
                <input
                  placeholder="Ask LifeAdmin AI a question..."
                  value={chatQuestion}
                  onChange={(event) => setChatQuestion(event.target.value)}
                  maxLength={2000}
                />
                <button disabled={loading || !chatQuestion.trim()}>
                  Send Message
                </button>
              </form>
            </section>

            <section className="panel">
              <h3>Scholarship-Specific Action Plan</h3>

              <select
                value={selectedScheme?.id || ""}
                onChange={(event) => {
                  const selected = schemes.find(
                    (scheme) => scheme.id === Number(event.target.value)
                  );
                  setSelectedScheme(selected || null);
                  setPlan(null);
                }}
              >
                <option value="">Select Scholarship</option>
                {schemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Ask a question about this scholarship..."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />

              <button
                disabled={!selectedScheme || loading}
                onClick={() => generatePlan(selectedScheme)}
              >
                Generate Action Plan
              </button>

              {plan && (
                <div>
                  <h3>{plan.scheme.name}</h3>
                  <pre>{plan.answer}</pre>

                  <h3>Document Checklist</h3>
                  {plan.documents.map((document, index) => (
                    <p key={index}>☐ {document}</p>
                  ))}

                  <h3>Application Procedure</h3>
                  <pre>{plan.steps}</pre>

                  <h3>Important Notice</h3>
                  <p>{plan.disclaimer}</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <section className="panel">
            <h3>Student Information</h3>

            <form className="form" onSubmit={saveProfile}>
              {[
                ["state", "State"],
                ["district", "District"],
                ["course", "Course"],
                ["year", "Academic Year"],
                ["category", "Category"],
                ["annual_income", "Annual Family Income (₹)"],
                ["institution", "Institution"],
              ].map(([key, label]) => {
                const isNumeric = key === "year" || key === "annual_income";

                return (
                  <label key={key}>
                    {label}
                    <input
                      type={isNumeric ? "number" : "text"}
                      min={
                        key === "year"
                          ? "1"
                          : key === "annual_income"
                          ? "0"
                          : undefined
                      }
                      max={key === "year" ? "10" : undefined}
                      step="1"
                      value={profile[key]}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          [key]: event.target.value,
                        })
                      }
                      required={
                        key !== "district" && key !== "institution"
                      }
                    />
                  </label>
                );
              })}

              <button disabled={loading}>Save Profile</button>
            </form>
          </section>
        )}

        {/* APPLICATIONS */}
        {tab === "applications" && (
          <>
            {applications.map((application) => (
              <section className="panel" key={application.id}>
                <h3>{application.scheme.name}</h3>
                <p>Current Status: {application.status}</p>
                <p>{application.notes}</p>

                <label>
                  Update Application Status
                  <select
                    value={application.status}
                    onChange={(event) =>
                      updateApplication(application.id, event.target.value)
                    }
                  >
                    <option>Interested</option>
                    <option>Documents Pending</option>
                    <option>Ready to Apply</option>
                    <option>Applied</option>
                    <option>Under Review</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                </label>

                <button
                  className="light"
                  onClick={() => removeApplication(application.id)}
                >
                  Remove Application
                </button>
              </section>
            ))}

            {applications.length === 0 && !loading && (
              <section className="panel">
                <h3>No Applications Yet</h3>
                <p>Explore scholarships and click Track to add one.</p>
              </section>
            )}
          </>
        )}

        {/* ADMIN PANEL */}
        {tab === "admin" && isAdmin && (
          <>
            <section className="panel">
              <h2>{editingScheme ? "Edit Scholarship" : "Add Scholarship"}</h2>

              <form className="form" onSubmit={saveScheme}>
                <label>
                  Scholarship Name
                  <input
                    required
                    minLength={2}
                    value={schemeForm.name}
                    onChange={(event) =>
                      setSchemeForm({
                        ...schemeForm,
                        name: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={schemeForm.description}
                    onChange={(event) =>
                      setSchemeForm({
                        ...schemeForm,
                        description: event.target.value,
                      })
                    }
                  />
                </label>

                {[
                  ["category", "Category"],
                  ["eligible_categories", "Eligible Categories"],
                  ["eligible_courses", "Eligible Courses"],
                  ["documents", "Required Documents (separate with ;)"],
                  ["steps", "Application Steps"],
                  ["source_name", "Official Source Name"],
                  ["source_url", "Official Source URL"],
                  ["verified_at", "Verified At / Verification Note"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type={key === "source_url" ? "url" : "text"}
                      value={schemeForm[key]}
                      onChange={(event) =>
                        setSchemeForm({
                          ...schemeForm,
                          [key]: event.target.value,
                        })
                      }
                    />
                  </label>
                ))}

                <label>
                  Maximum Annual Income (₹)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={schemeForm.max_income}
                    onChange={(event) =>
                      setSchemeForm({
                        ...schemeForm,
                        max_income: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Application Deadline
                  <input
                    type="date"
                    value={schemeForm.deadline}
                    onChange={(event) =>
                      setSchemeForm({
                        ...schemeForm,
                        deadline: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={schemeForm.is_demo}
                    onChange={(event) =>
                      setSchemeForm({
                        ...schemeForm,
                        is_demo: event.target.checked,
                      })
                    }
                  />
                  Demo / illustrative record
                </label>

                <button disabled={loading}>
                  {editingScheme ? "Save Changes" : "Add Scholarship"}
                </button>

                {editingScheme && (
                  <button
                    type="button"
                    className="light"
                    onClick={() => {
                      setEditingScheme(null);
                      setSchemeForm(emptySchemeForm());
                    }}
                  >
                    Cancel Editing
                  </button>
                )}
              </form>
            </section>

            <section className="panel">
              <h2>Upload Scholarship PDF for AI Search</h2>
              <p>
                Uploaded PDFs are text-extracted and indexed for retrieval by
                the AI assistant.
              </p>

              <form onSubmit={uploadPdf}>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) =>
                    setPdfFile(event.target.files?.[0] || null)
                  }
                />
                <button disabled={loading || !pdfFile}>
                  Upload and Index PDF
                </button>
              </form>
            </section>

            <section className="panel">
              <h2>Manage Existing Scholarships</h2>

              {schemes.map((scheme) => (
                <div className="panel" key={scheme.id}>
                  <h3>{scheme.name}</h3>
                  <button onClick={() => startEditingScheme(scheme)}>
                    Edit
                  </button>
                  <button
                    className="light"
                    onClick={() => removeScheme(scheme.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}

              {schemes.length === 0 && <p>No scholarship records available.</p>}
            </section>
          </>
        )}

        <footer>LifeAdmin AI · Maharashtra Scholarship Assistant</footer>
      </main>
    </div>
  );
}
