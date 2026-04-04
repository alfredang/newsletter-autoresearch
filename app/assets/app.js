import {
  addDoc,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  onAuthChange,
  query,
  serverTimestamp,
  setDoc,
  signInWithGithub,
  signInWithGoogle,
  signOutUser,
  updateDoc,
  where,
} from "./firebase.js";

const appEl = document.getElementById("app");

const state = {
  user: null,
  theme: localStorage.getItem("theme") || "dark",
  runningLogTimer: null,
};

applyTheme(state.theme);

onAuthChange(async (user) => {
  state.user = user || null;
  render();
});

window.addEventListener("hashchange", () => render());
window.addEventListener("DOMContentLoaded", () => render());

function routePath() {
  return (location.hash.replace(/^#/, "") || "/").trim();
}

function navigate(path) {
  location.hash = path;
}

function isProtected(path) {
  return ["/dashboard", "/projects", "/hypotheses", "/settings"].some((base) => path.startsWith(base));
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  return 0;
}

function fmtDate(value) {
  const ms = toMillis(value);
  if (!ms) return "n/a";
  return new Date(ms).toLocaleString();
}

function badgeByStatus(status) {
  if (["active", "pass", "keep", "completed"].includes(status)) return "badge badge-success";
  if (["failed", "discard", "archived"].includes(status)) return "badge badge-danger";
  if (["running", "paused", "pending", "quick"].includes(status)) return "badge badge-warning";
  return "badge badge-secondary";
}

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem("theme", theme);
  document.documentElement.classList.toggle("light", theme === "light");
}

function shell(content, title, subtitle) {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-top">
          <a class="logo" href="#/dashboard">
            <div class="logo-mark">NR</div>
            <div>
              <h2>Nova Research</h2>
              <p>Experiment Lab</p>
            </div>
          </a>
        </div>
        <nav class="nav">
          <a href="#/dashboard" class="${routePath().startsWith("/dashboard") ? "active" : ""}">Dashboard</a>
          <a href="#/projects" class="${routePath().startsWith("/projects") ? "active" : ""}">Projects</a>
          <a href="#/hypotheses" class="${routePath().startsWith("/hypotheses") ? "active" : ""}">Hypotheses</a>
          <a href="#/settings" class="${routePath().startsWith("/settings") ? "active" : ""}">Settings</a>
        </nav>
        <div class="sidebar-bottom">
          <button class="btn btn-secondary" id="theme-toggle" type="button">
            ${state.theme === "dark" ? "Light theme" : "Dark theme"}
          </button>
          <div class="mt-4 muted">${state.user?.email || "Not signed in"}</div>
          <div class="mt-2 btn-row">
            <button class="btn btn-secondary" id="sign-out" type="button">Sign out</button>
          </div>
        </div>
      </aside>
      <main class="main">
        <div class="page-header">
          <div>
            <h1>${title}</h1>
            ${subtitle ? `<div class="page-subtitle">${subtitle}</div>` : ""}
          </div>
        </div>
        ${content}
      </main>
    </div>
  `;
}

async function fetchCollection(name, uid) {
  const q = query(collection(db, name), where("userId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getProject(projectId, uid) {
  const ref = doc(db, "projects", projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const project = { id: snap.id, ...snap.data() };
  if (project.userId !== uid) return null;
  return project;
}

async function renderLanding() {
  appEl.innerHTML = `
    <section class="hero">
      <div class="badge badge-primary">AI-powered research platform</div>
      <h1 class="mt-4">The Future of <span class="text-gradient">Auto Research</span></h1>
      <p class="mt-4">Run the same loop you already use: Hypothesis -> Modify -> Run -> Evaluate -> Keep/Discard -> Repeat.</p>
      <div class="btn-row mt-6">
        <button class="btn btn-primary" id="go-signin">Get Started</button>
        <button class="btn btn-secondary" id="go-signin-2">Sign In</button>
      </div>
      <div class="grid grid-3 mt-6">
        <div class="card"><h3>10x faster</h3><p class="muted mt-2">Iterate in minutes.</p></div>
        <div class="card"><h3>Social login</h3><p class="muted mt-2">Google + GitHub with Firebase.</p></div>
        <div class="card"><h3>Decision loop</h3><p class="muted mt-2">Keep or discard each iteration.</p></div>
      </div>
    </section>
  `;
  document.getElementById("go-signin").onclick = () => navigate("/signin");
  document.getElementById("go-signin-2").onclick = () => navigate("/signin");
}

async function renderSignIn() {
  appEl.innerHTML = `
    <section class="hero" style="max-width:560px;">
      <div class="card">
        <h2>Welcome Back</h2>
        <p class="muted mt-2">Sign in with Firebase social login.</p>
        <div class="btn-row mt-6">
          <button class="btn btn-primary" id="google-signin">Continue with Google</button>
          <button class="btn btn-secondary" id="github-signin">Continue with GitHub</button>
        </div>
        <p class="muted mt-4">You will be redirected to your dashboard after sign-in.</p>
      </div>
    </section>
  `;

  document.getElementById("google-signin").onclick = async () => {
    await signInWithGoogle();
    navigate("/dashboard");
  };
  document.getElementById("github-signin").onclick = async () => {
    await signInWithGithub();
    navigate("/dashboard");
  };
}

async function renderDashboard() {
  const [projects, hypotheses, iterations, runs, decisions] = await Promise.all([
    fetchCollection("projects", state.user.uid),
    fetchCollection("hypotheses", state.user.uid),
    fetchCollection("iterations", state.user.uid),
    fetchCollection("runs", state.user.uid),
    fetchCollection("decisions", state.user.uid),
  ]);

  const kept = decisions.filter((d) => d.decision === "keep").length;
  const discarded = decisions.filter((d) => d.decision === "discard").length;
  const successRate = kept + discarded === 0 ? 0 : Math.round((kept / (kept + discarded)) * 100);

  const content = `
    <div class="grid grid-6">
      <div class="card"><div class="muted">Total Projects</div><div class="stat-num">${projects.length}</div></div>
      <div class="card"><div class="muted">Active Hypotheses</div><div class="stat-num">${hypotheses.filter((h) => h.status === "active").length}</div></div>
      <div class="card"><div class="muted">Running</div><div class="stat-num">${runs.filter((r) => r.status === "running").length}</div></div>
      <div class="card"><div class="muted">Completed</div><div class="stat-num">${runs.filter((r) => r.status === "completed").length}</div></div>
      <div class="card"><div class="muted">Kept</div><div class="stat-num">${kept}</div></div>
      <div class="card"><div class="muted">Success Rate</div><div class="stat-num">${successRate}%</div></div>
    </div>

    <div class="grid grid-2 mt-6">
      <div class="card">
        <h3>Recent Projects</h3>
        <div class="mt-4">
          ${projects
            .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
            .slice(0, 5)
            .map(
              (p) => `<a class="list-item" href="#/projects/${p.id}"><div><strong>${p.name}</strong><div class="muted">${p.category || "custom"}</div></div><span class="${badgeByStatus(
                p.status || "active"
              )}">${p.status || "active"}</span></a>`
            )
            .join("") || '<div class="muted">No projects yet.</div>'}
        </div>
      </div>
      <div class="card">
        <h3>Loop Reminder</h3>
        <p class="muted mt-4">Hypothesis -> Modify -> Run -> Evaluate -> Decide -> Repeat.</p>
        <div class="btn-row mt-4">
          <a class="btn btn-primary" href="#/projects/new">New Project</a>
          <a class="btn btn-secondary" href="#/projects">View Projects</a>
        </div>
      </div>
    </div>
  `;

  appEl.innerHTML = shell(content, "Dashboard", "Overview of your experiments");
  bindShellActions();
}

async function renderProjects() {
  const all = await fetchCollection("projects", state.user.uid);
  const content = `
    <div class="card">
      <div class="btn-row">
        <input class="input" id="project-search" placeholder="Search projects" />
        <a class="btn btn-primary" href="#/projects/new">New Project</a>
      </div>
    </div>
    <div class="grid grid-3 mt-4" id="projects-grid"></div>
  `;
  appEl.innerHTML = shell(content, "Projects", "Manage your research projects");
  bindShellActions();

  const grid = document.getElementById("projects-grid");
  const search = document.getElementById("project-search");

  function paint(filter = "") {
    const filtered = all.filter((p) => {
      const t = `${p.name || ""} ${p.description || ""}`.toLowerCase();
      return t.includes(filter.toLowerCase());
    });

    if (!filtered.length) {
      grid.innerHTML = '<div class="card center">No projects found.</div>';
      return;
    }

    grid.innerHTML = filtered
      .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
      .map(
        (p) => `
        <a class="card" href="#/projects/${p.id}">
          <div class="badge badge-primary">${p.category || "custom"}</div>
          <h3 class="mt-2">${p.name}</h3>
          <p class="muted mt-2">${p.description || "No description"}</p>
          <div class="mt-4 ${badgeByStatus(p.status || "active")}">${p.status || "active"}</div>
        </a>
      `
      )
      .join("");
  }

  search.addEventListener("input", () => paint(search.value));
  paint();
}

async function renderNewProject() {
  const content = `
    <form class="card" id="project-form">
      <label class="label">Project Name *</label>
      <input class="input" name="name" required />

      <label class="label mt-4">Description</label>
      <textarea class="textarea" name="description"></textarea>

      <label class="label mt-4">Category</label>
      <select class="select" name="category">
        <option value="marketing">Marketing</option>
        <option value="trading">Trading</option>
        <option value="ml">Machine Learning</option>
        <option value="product">Product</option>
        <option value="business">Business</option>
        <option value="custom" selected>Custom</option>
      </select>

      <label class="label mt-4">Goal</label>
      <input class="input" name="goal" />

      <label class="label mt-4">Tags (comma separated)</label>
      <input class="input" name="tags" placeholder="newsletter, optimization" />

      <div class="btn-row mt-6">
        <button class="btn btn-primary" type="submit">Create Project</button>
        <a class="btn btn-secondary" href="#/projects">Cancel</a>
      </div>
    </form>
  `;
  appEl.innerHTML = shell(content, "New Project", "Create a new research project");
  bindShellActions();

  document.getElementById("project-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const project = {
      userId: state.user.uid,
      name: fd.get("name").toString().trim(),
      description: fd.get("description").toString().trim(),
      category: fd.get("category").toString(),
      goal: fd.get("goal").toString().trim(),
      tags: fd
        .get("tags")
        .toString()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, "projects"), project);
    navigate(`/projects/${ref.id}`);
  };
}

async function renderProjectDetail(projectId) {
  const project = await getProject(projectId, state.user.uid);
  if (!project) {
    navigate("/projects");
    return;
  }

  const [hypotheses, iterations, runs, evaluations, decisions] = await Promise.all([
    fetchCollection("hypotheses", state.user.uid),
    fetchCollection("iterations", state.user.uid),
    fetchCollection("runs", state.user.uid),
    fetchCollection("evaluations", state.user.uid),
    fetchCollection("decisions", state.user.uid),
  ]);

  const byProjectHyp = hypotheses.filter((h) => h.projectId === projectId);
  const content = `
    <div class="card">
      <div class="btn-row">
        <span class="badge badge-primary">${project.category || "custom"}</span>
        <span class="${badgeByStatus(project.status || "active")}">${project.status || "active"}</span>
      </div>
      <p class="muted mt-4">${project.description || "No description."}</p>
      <p class="mt-2"><strong>Goal:</strong> ${project.goal || "n/a"}</p>
      <div class="btn-row mt-4">
        <a class="btn btn-primary" href="#/projects/${projectId}/hypothesis/new">New Hypothesis</a>
        <a class="btn btn-secondary" href="#/projects">Back to Projects</a>
      </div>
    </div>

    <div class="mt-6">
      ${
        byProjectHyp.length
          ? byProjectHyp
              .map((h) => {
                const its = iterations
                  .filter((it) => it.hypothesisId === h.id)
                  .sort((a, b) => (b.iterationNumber || 0) - (a.iterationNumber || 0));
                const rows = its
                  .map((it) => {
                    const run = runs.find((r) => r.id === it.runId);
                    const evaln = evaluations.find((ev) => ev.id === it.evaluationId);
                    const dec = decisions.find((d) => d.id === it.decisionId);
                    const stage = dec
                      ? dec.decision
                      : evaln
                      ? "evaluated"
                      : run
                      ? run.status
                      : it.codeVersionId
                      ? "modified"
                      : "created";

                    return `
                    <div class="list-item">
                      <div>
                        <strong>#${it.iterationNumber || 1}</strong>
                        <div class="muted">${stage}${evaln?.score ? ` | score: ${Number(evaln.score).toFixed(4)}` : ""}</div>
                      </div>
                      <div class="btn-row">
                        ${
                          !it.codeVersionId
                            ? `<a class="btn btn-secondary" href="#/projects/${projectId}/modify/${it.id}">Modify</a>`
                            : ""
                        }
                        ${!it.runId ? `<a class="btn btn-primary" href="#/projects/${projectId}/run/${it.id}">Run</a>` : ""}
                        ${run && run.status === "completed" && !it.decisionId ? `<a class="btn btn-secondary" href="#/projects/${projectId}/decision/${it.id}">Decide</a>` : ""}
                      </div>
                    </div>
                  `;
                  })
                  .join("");

                return `
                <div class="card mt-4">
                  <h3>${h.title}</h3>
                  <p class="muted mt-2">${h.statement}</p>
                  <div class="mt-4">${rows || '<div class="muted">No iterations.</div>'}</div>
                </div>
              `;
              })
              .join("")
          : '<div class="card center">No hypotheses yet. Create one to start the loop.</div>'
      }
    </div>
  `;

  appEl.innerHTML = shell(content, project.name, "Hypothesis -> Modify -> Run -> Evaluate -> Decide");
  bindShellActions();
}

async function renderNewHypothesis(projectId) {
  const project = await getProject(projectId, state.user.uid);
  if (!project) {
    navigate("/projects");
    return;
  }

  const content = `
    <form class="card" id="hypothesis-form">
      <label class="label">Title *</label>
      <input class="input" name="title" required />

      <label class="label mt-4">Hypothesis Statement *</label>
      <textarea class="textarea" name="statement" required></textarea>

      <label class="label mt-4">Rationale</label>
      <textarea class="textarea" name="rationale"></textarea>

      <label class="label mt-4">Variables Changed</label>
      <textarea class="textarea" name="variablesChanged"></textarea>

      <label class="label mt-4">Expected Impact</label>
      <input class="input" name="expectedImpact" />

      <label class="label mt-4">Success Criteria</label>
      <textarea class="textarea" name="successCriteria"></textarea>

      <label class="label mt-4">Notes</label>
      <textarea class="textarea" name="notes"></textarea>

      <div class="btn-row mt-6">
        <button class="btn btn-primary" type="submit">Create Hypothesis</button>
        <a class="btn btn-secondary" href="#/projects/${projectId}">Cancel</a>
      </div>
    </form>
  `;

  appEl.innerHTML = shell(content, "New Hypothesis", project.name);
  bindShellActions();

  document.getElementById("hypothesis-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const hypRef = await addDoc(collection(db, "hypotheses"), {
      userId: state.user.uid,
      projectId,
      title: fd.get("title").toString(),
      statement: fd.get("statement").toString(),
      rationale: fd.get("rationale").toString(),
      variablesChanged: fd.get("variablesChanged").toString(),
      expectedImpact: fd.get("expectedImpact").toString(),
      successCriteria: fd.get("successCriteria").toString(),
      notes: fd.get("notes").toString(),
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "iterations"), {
      userId: state.user.uid,
      projectId,
      hypothesisId: hypRef.id,
      iterationNumber: 1,
      status: "hypothesis",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    navigate(`/projects/${projectId}`);
  };
}

async function renderModify(projectId, iterationId) {
  const iterRef = doc(db, "iterations", iterationId);
  const iterSnap = await getDoc(iterRef);
  if (!iterSnap.exists()) {
    navigate(`/projects/${projectId}`);
    return;
  }
  const iteration = { id: iterSnap.id, ...iterSnap.data() };

  let existingCode = "{}";
  let existingConfig = "{}";
  let desc = "";

  if (iteration.codeVersionId) {
    const cvSnap = await getDoc(doc(db, "codeVersions", iteration.codeVersionId));
    if (cvSnap.exists()) {
      const cv = cvSnap.data();
      existingCode = JSON.stringify(cv.codeContent || {}, null, 2);
      existingConfig = JSON.stringify(cv.config || {}, null, 2);
      desc = cv.description || "";
    }
  }

  const content = `
    <form class="card" id="modify-form">
      <label class="label">Code Content (JSON)</label>
      <textarea class="textarea" style="min-height:220px" name="codeContent">${existingCode}</textarea>

      <label class="label mt-4">Configuration (JSON)</label>
      <textarea class="textarea" name="config">${existingConfig}</textarea>

      <label class="label mt-4">Description</label>
      <input class="input" name="description" value="${desc.replaceAll('"', "&quot;")}" />

      <div class="btn-row mt-6">
        <button class="btn btn-primary" type="submit">Save & Continue</button>
        <button class="btn btn-secondary" id="ai-suggest" type="button">AI Suggest</button>
        <a class="btn btn-secondary" href="#/projects/${projectId}">Cancel</a>
      </div>
    </form>
  `;

  appEl.innerHTML = shell(content, "Modify Code", `Iteration #${iteration.iterationNumber || 1}`);
  bindShellActions();

  document.getElementById("ai-suggest").onclick = () => {
    const codeArea = document.querySelector("textarea[name='codeContent']");
    let parsed = {};
    try {
      parsed = JSON.parse(codeArea.value || "{}");
    } catch {
      parsed = {};
    }
    parsed._aiSuggestion = "Use shorter prompts and clear targets for quicker convergence.";
    parsed._timestamp = new Date().toISOString();
    codeArea.value = JSON.stringify(parsed, null, 2);
  };

  document.getElementById("modify-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    let codeContent = {};
    let config = {};
    try {
      codeContent = JSON.parse(fd.get("codeContent").toString() || "{}");
      config = JSON.parse(fd.get("config").toString() || "{}");
    } catch {
      alert("Code content and config must be valid JSON.");
      return;
    }

    let codeVersionId = iteration.codeVersionId;
    if (!codeVersionId) {
      const cvRef = await addDoc(collection(db, "codeVersions"), {
        userId: state.user.uid,
        projectId,
        iterationId,
        versionNumber: 1,
        codeContent,
        config,
        description: fd.get("description").toString(),
        createdAt: serverTimestamp(),
      });
      codeVersionId = cvRef.id;
    } else {
      await updateDoc(doc(db, "codeVersions", codeVersionId), {
        codeContent,
        config,
        description: fd.get("description").toString(),
      });
    }

    await updateDoc(iterRef, {
      codeVersionId,
      status: "modifying",
      updatedAt: serverTimestamp(),
    });

    navigate(`/projects/${projectId}`);
  };
}

async function renderRun(projectId, iterationId) {
  const iterSnap = await getDoc(doc(db, "iterations", iterationId));
  if (!iterSnap.exists()) {
    navigate(`/projects/${projectId}`);
    return;
  }
  const iteration = { id: iterSnap.id, ...iterSnap.data() };

  const content = `
    <div class="card">
      <h3>Run Experiment</h3>
      <p class="muted mt-2">Iteration #${iteration.iterationNumber || 1}</p>

      <div class="grid grid-2 mt-4">
        <label class="card">
          <input type="radio" name="runType" value="manual" checked />
          <strong class="mt-2">Manual Run</strong>
          <div class="muted mt-2">Full execution.</div>
        </label>
        <label class="card">
          <input type="radio" name="runType" value="quick" />
          <strong class="mt-2">Quick Run (5 min)</strong>
          <div class="muted mt-2">Fast loop testing.</div>
        </label>
      </div>

      <div class="btn-row mt-4">
        <button class="btn btn-primary" id="start-run">Start Experiment</button>
        <a class="btn btn-secondary" href="#/projects/${projectId}">Back</a>
      </div>

      <div class="mt-4" id="run-panel"></div>
    </div>
  `;

  appEl.innerHTML = shell(content, "Run", "Execute iteration");
  bindShellActions();

  const panel = document.getElementById("run-panel");
  document.getElementById("start-run").onclick = async () => {
    const runType = document.querySelector("input[name='runType']:checked").value;

    const runRef = await addDoc(collection(db, "runs"), {
      userId: state.user.uid,
      projectId,
      iterationId,
      runType,
      status: "running",
      logs: "Initializing run...",
      startedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "iterations", iterationId), {
      runId: runRef.id,
      status: "running",
      updatedAt: serverTimestamp(),
    });

    panel.innerHTML = `<div class="card"><div class="muted">Progress</div><div id="progress-text" class="stat-num">0%</div><div id="log-lines" class="muted mt-2"></div></div>`;

    const steps = [
      [15, "Loading code version..."],
      [30, "Validating configuration..."],
      [55, "Executing experiment logic..."],
      [78, "Collecting metrics..."],
      [92, "Computing score..."],
      [100, "Completed"],
    ];

    let logs = [];
    for (const [pct, msg] of steps) {
      await new Promise((r) => setTimeout(r, 850));
      logs.push(msg);
      document.getElementById("progress-text").textContent = `${pct}%`;
      document.getElementById("log-lines").innerHTML = logs.map((l) => `<div>• ${l}</div>`).join("");
    }

    const score = Math.random() * 0.5 + 0.3;
    const openRate = Math.random() * 0.3 + 0.2;
    const clickRate = Math.random() * 0.2 + 0.05;

    const metricRows = [
      { metricName: "score", metricValue: score, targetValue: 0.4, unit: "ratio" },
      { metricName: "open_rate", metricValue: openRate, targetValue: 0.4, unit: "ratio" },
      { metricName: "click_rate", metricValue: clickRate, targetValue: 0.15, unit: "ratio" },
    ];

    for (const row of metricRows) {
      await addDoc(collection(db, "metrics"), {
        userId: state.user.uid,
        projectId,
        runId: runRef.id,
        ...row,
        recordedAt: serverTimestamp(),
      });
    }

    const evalRef = await addDoc(collection(db, "evaluations"), {
      userId: state.user.uid,
      projectId,
      runId: runRef.id,
      score,
      status: score >= 0.4 ? "pass" : "fail",
      summary:
        score >= 0.4
          ? "Experiment met target threshold. Consider keeping."
          : "Experiment fell below threshold. Consider discarding.",
      recommendations:
        score >= 0.4
          ? ["Keep this iteration", "Tune further for higher click rate"]
          : ["Review hypothesis", "Adjust code or config and rerun"],
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "runs", runRef.id), {
      status: "completed",
      logs: logs.join("\n"),
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "iterations", iterationId), {
      status: "evaluating",
      evaluationId: evalRef.id,
      updatedAt: serverTimestamp(),
    });

    panel.innerHTML += `<div class="btn-row mt-4"><a class="btn btn-primary" href="#/projects/${projectId}/decision/${iterationId}">Make Decision</a></div>`;
  };
}

async function renderDecision(projectId, iterationId) {
  const iterSnap = await getDoc(doc(db, "iterations", iterationId));
  if (!iterSnap.exists()) {
    navigate(`/projects/${projectId}`);
    return;
  }
  const iteration = { id: iterSnap.id, ...iterSnap.data() };

  const [runs, evaluations, metrics] = await Promise.all([
    fetchCollection("runs", state.user.uid),
    fetchCollection("evaluations", state.user.uid),
    fetchCollection("metrics", state.user.uid),
  ]);

  const run = runs.find((r) => r.id === iteration.runId);
  const evaluation = evaluations.find((ev) => ev.id === iteration.evaluationId);
  const runMetrics = metrics.filter((m) => m.runId === run?.id);

  const content = `
    <div class="card">
      <h3>Evaluation Results</h3>
      <div class="mt-4 list-item">
        <div>
          <div class="muted">Score</div>
          <div class="stat-num">${evaluation?.score ? Number(evaluation.score).toFixed(4) : "n/a"}</div>
        </div>
        <div class="${badgeByStatus(evaluation?.status || "pending")}">${evaluation?.status || "pending"}</div>
      </div>

      <div class="mt-4">
        ${runMetrics
          .map(
            (m) => `<div class="list-item"><div><strong>${m.metricName}</strong><div class="muted">target: ${
              m.targetValue ?? "n/a"
            }</div></div><div>${Number(m.metricValue).toFixed(4)}</div></div>`
          )
          .join("")}
      </div>

      <label class="label mt-4">Reason (optional)</label>
      <textarea id="decision-reason" class="textarea" placeholder="Why keep or discard?"></textarea>

      <div class="btn-row mt-4">
        <button class="btn btn-success" id="keep-btn">Keep</button>
        <button class="btn btn-danger" id="discard-btn">Discard</button>
        <a class="btn btn-secondary" href="#/projects/${projectId}">Cancel</a>
      </div>
    </div>
  `;

  appEl.innerHTML = shell(content, "Decision", `Iteration #${iteration.iterationNumber || 1}`);
  bindShellActions();

  const handleDecision = async (choice) => {
    const reason = document.getElementById("decision-reason").value;
    const decisionRef = await addDoc(collection(db, "decisions"), {
      userId: state.user.uid,
      projectId,
      iterationId,
      decision: choice,
      reason,
      decidedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "iterations", iterationId), {
      decisionId: decisionRef.id,
      status: "decided",
      updatedAt: serverTimestamp(),
    });

    navigate(`/projects/${projectId}`);
  };

  document.getElementById("keep-btn").onclick = () => handleDecision("keep");
  document.getElementById("discard-btn").onclick = () => handleDecision("discard");
}

async function renderHypotheses() {
  const [hypotheses, projects, iterations, decisions] = await Promise.all([
    fetchCollection("hypotheses", state.user.uid),
    fetchCollection("projects", state.user.uid),
    fetchCollection("iterations", state.user.uid),
    fetchCollection("decisions", state.user.uid),
  ]);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const content = `
    <div class="card">
      <input class="input" id="hyp-search" placeholder="Search hypotheses" />
    </div>
    <div class="mt-4" id="hyp-list"></div>
  `;

  appEl.innerHTML = shell(content, "Hypotheses", "Across all projects");
  bindShellActions();

  const list = document.getElementById("hyp-list");
  const search = document.getElementById("hyp-search");

  function paint(filter = "") {
    const filtered = hypotheses.filter((h) => {
      const text = `${h.title || ""} ${h.statement || ""}`.toLowerCase();
      return text.includes(filter.toLowerCase());
    });

    if (!filtered.length) {
      list.innerHTML = '<div class="card center">No hypotheses found.</div>';
      return;
    }

    list.innerHTML = filtered
      .map((h) => {
        const related = iterations
          .filter((it) => it.hypothesisId === h.id)
          .sort((a, b) => (b.iterationNumber || 0) - (a.iterationNumber || 0));
        const latest = related[0];
        const dec = latest ? decisions.find((d) => d.id === latest.decisionId) : null;
        return `
          <a class="card" href="#/projects/${h.projectId}">
            <h3>${h.title}</h3>
            <p class="muted mt-2">${h.statement}</p>
            <div class="btn-row mt-4">
              <span class="badge badge-secondary">${projectMap[h.projectId]?.name || "Unknown project"}</span>
              <span class="${badgeByStatus(h.status || "active")}">${h.status || "active"}</span>
              ${dec ? `<span class="${badgeByStatus(dec.decision)}">${dec.decision}</span>` : ""}
            </div>
          </a>
        `;
      })
      .join("");
  }

  search.addEventListener("input", () => paint(search.value));
  paint();
}

async function renderSettings() {
  const content = `
    <div class="grid grid-2">
      <div class="card">
        <h3>Profile</h3>
        <p class="muted mt-2">${state.user.displayName || "User"}</p>
        <p class="muted">${state.user.email || ""}</p>
      </div>
      <div class="card">
        <h3>Appearance</h3>
        <p class="muted mt-2">Choose your preferred theme.</p>
        <div class="btn-row mt-4">
          <button class="btn btn-secondary" id="settings-theme">${state.theme === "dark" ? "Switch to Light" : "Switch to Dark"}</button>
        </div>
      </div>
      <div class="card">
        <h3>Notifications</h3>
        <p class="muted mt-2">Email notifications toggle is UI-only for now.</p>
        <button class="btn btn-secondary mt-4" type="button">Enabled</button>
      </div>
      <div class="card">
        <h3>Security</h3>
        <p class="muted mt-2">Firebase social login is active.</p>
        <button class="btn btn-secondary mt-4" id="settings-signout">Sign out</button>
      </div>
    </div>
  `;

  appEl.innerHTML = shell(content, "Settings", "Manage account preferences");
  bindShellActions();

  document.getElementById("settings-theme").onclick = () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
    render();
  };
  document.getElementById("settings-signout").onclick = async () => {
    await signOutUser();
    navigate("/signin");
  };
}

function bindShellActions() {
  const signOutBtn = document.getElementById("sign-out");
  const toggleBtn = document.getElementById("theme-toggle");
  if (signOutBtn) {
    signOutBtn.onclick = async () => {
      await signOutUser();
      navigate("/signin");
    };
  }
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      applyTheme(state.theme === "dark" ? "light" : "dark");
      render();
    };
  }
}

async function render() {
  const path = routePath();

  if (isProtected(path) && !state.user) {
    await renderSignIn();
    return;
  }

  if (path === "/" || path === "") {
    await renderLanding();
    return;
  }

  if (path === "/signin") {
    if (state.user) {
      navigate("/dashboard");
      return;
    }
    await renderSignIn();
    return;
  }

  if (path === "/dashboard") return renderDashboard();
  if (path === "/projects") return renderProjects();
  if (path === "/projects/new") return renderNewProject();
  if (path === "/hypotheses") return renderHypotheses();
  if (path === "/settings") return renderSettings();

  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "projects" && parts[1]) {
    const projectId = parts[1];
    if (parts.length === 2) return renderProjectDetail(projectId);
    if (parts[2] === "hypothesis" && parts[3] === "new") return renderNewHypothesis(projectId);
    if (parts[2] === "modify" && parts[3]) return renderModify(projectId, parts[3]);
    if (parts[2] === "run" && parts[3]) return renderRun(projectId, parts[3]);
    if (parts[2] === "decision" && parts[3]) return renderDecision(projectId, parts[3]);
  }

  appEl.innerHTML = '<section class="hero"><h1>Not Found</h1><p class="muted mt-4">Route does not exist.</p><a class="btn btn-primary mt-4" href="#/dashboard">Go Dashboard</a></section>';
}
