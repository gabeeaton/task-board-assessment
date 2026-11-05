import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import "./style.css";

const STATUSES = [
  { key: "todo", label: "To Do", dot: "var(--slate)" },
  { key: "in_progress", label: "In Progress", dot: "var(--blue)" },
  { key: "in_review", label: "In Review", dot: "var(--amber)" },
  { key: "done", label: "Done", dot: "var(--green)" },
];
const DEMO = [
  {
    id: "d1",
    title: "Map the first-time user journey",
    description: "List the steps from sign-in to first task creation.",
    status: "todo",
    priority: "high",
    due_date: "2026-11-06",
    created_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "d2",
    title: "Explore visual directions for the dashboard",
    description: "Collect references and choose a clear direction.",
    status: "todo",
    priority: "normal",
    due_date: null,
    created_at: "2026-11-01T11:00:00Z",
  },
  {
    id: "d3",
    title: "Build the task detail experience",
    description: "Add task fields, validation, and save controls.",
    status: "in_progress",
    priority: "high",
    due_date: "2026-11-04",
    created_at: "2026-11-01T12:00:00Z",
  },
  {
    id: "d4",
    title: "Write onboarding microcopy",
    description: "Draft the first-run instructions.",
    status: "in_progress",
    priority: "low",
    due_date: null,
    created_at: "2026-11-01T13:00:00Z",
  },
  {
    id: "d5",
    title: "Review navigation patterns",
    description: "Check the layout across desktop and mobile.",
    status: "in_review",
    priority: "normal",
    due_date: "2026-11-08",
    created_at: "2026-11-01T14:00:00Z",
  },
  {
    id: "d6",
    title: "Set the product foundations",
    description: "Define colors, type, spacing, and interactions.",
    status: "done",
    priority: "normal",
    due_date: null,
    created_at: "2026-11-01T15:00:00Z",
  },
];
const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID();
const storageKey = "forma-demo-tasks-v1";
const oldDemoDescriptions = {
  d1: "Make the initial experience feel effortless from the first click.",
  d3: "A quiet space for context, dates, and the next action.",
  d4: "Keep the copy useful and human.",
  d6: "Color, type, spacing, and interaction principles.",
};
const connected = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
const client = connected
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
const state = {
  tasks: [],
  user: null,
  query: "",
  priority: "all",
  selected: null,
  loading: true,
  error: "",
  busy: false,
  dragging: null,
  toast: "",
  previewFallback: false,
};
const isLocal = () => !connected || state.previewFallback;
function loadLocal() {
  const saved = localStorage.getItem(storageKey);
  state.tasks = saved ? JSON.parse(saved) : DEMO.map((t) => ({ ...t }));
  if (saved) {
    state.tasks = state.tasks.map((task) => {
      const updated = DEMO.find((sample) => sample.id === task.id);
      return updated && task.description === oldDemoDescriptions[task.id]
        ? { ...task, description: updated.description }
        : task;
    });
  }
  localStorage.setItem(storageKey, JSON.stringify(state.tasks));
}

function icon(name, size = 18) {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
    trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
function visibleTasks() {
  return state.tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(state.query.toLowerCase()) &&
      (state.priority === "all" || t.priority === state.priority),
  );
}
function dueMeta(t) {
  if (!t.due_date) return "";
  const days = Math.floor(
    (new Date(`${t.due_date}T23:59:59`) - new Date()) / 86400000,
  );
  const kind =
    t.status !== "done" && days < 0
      ? "overdue"
      : t.status !== "done" && days <= 2
        ? "soon"
        : "";
  return `<span class="due ${kind}">${icon("calendar", 14)} ${esc(formatDate(t.due_date))}${kind === "overdue" ? " · Overdue" : ""}</span>`;
}
function card(t) {
  return `<button class="task-card" type="button" data-task="${esc(t.id)}" draggable="true" aria-label="Open task: ${esc(t.title)}">
    <span class="card-top"><span class="priority ${esc(t.priority || "normal")}"><i></i>${esc(t.priority || "normal")}</span>${icon("dots", 17)}</span>
    <strong>${esc(t.title)}</strong>${t.description ? `<span class="card-desc">${esc(t.description)}</span>` : ""}
    <span class="card-bottom">${dueMeta(t)}<span class="card-arrow">${icon("arrow", 16)}</span></span>
  </button>`;
}
function board() {
  const filtered = visibleTasks();
  return `<div class="board" id="board">${STATUSES.map((s) => {
    const items = filtered.filter((t) => t.status === s.key);
    return `<section class="column" data-status="${s.key}" aria-label="${s.label} column">
      <div class="column-head"><span class="column-title"><i style="background:${s.dot}"></i>${s.label}<b>${items.length}</b></span><button class="icon-button add-column" type="button" data-add="${s.key}" aria-label="Add task to ${s.label}">${icon("plus", 18)}</button></div>
      <div class="column-body">${items.length ? items.map(card).join("") : `<div class="empty-column"><span class="empty-art">${icon(s.key === "done" ? "check" : "plus", 19)}</span><span>${state.query || state.priority !== "all" ? "No matching tasks" : "No tasks"}</span></div>`}</div>
      <button class="add-task-inline" type="button" data-add="${s.key}">${icon("plus", 16)} Add task</button>
    </section>`;
  }).join("")}</div>`;
}
function modal() {
  if (!state.selected) return "";
  const t =
    state.selected === "new"
      ? null
      : state.tasks.find((item) => item.id === state.selected);
  const isNew = !t;
  return `<div class="modal-backdrop" data-close="true"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-top"><button class="icon-button" type="button" data-close="true" aria-label="Close">${icon("close", 18)}</button></div>
    <form id="task-form"><input type="hidden" name="id" value="${esc(t?.id || "")}"/><h2 id="modal-title">${isNew ? "New task" : "Edit task"}</h2>
      <label class="field"><span>Title <em>*</em></span><input name="title" required maxlength="160" placeholder="Task title" value="${esc(t?.title || "")}" autofocus/></label>
      <label class="field"><span>Description</span><textarea name="description" maxlength="2000" rows="4" placeholder="Description">${esc(t?.description || "")}</textarea></label>
      <div class="field-row"><label class="field"><span>Status</span><select name="status">${STATUSES.map((s) => `<option value="${s.key}" ${(t?.status || state.newStatus || "todo") === s.key ? "selected" : ""}>${s.label}</option>`).join("")}</select></label><label class="field"><span>Priority</span><select name="priority">${["low", "normal", "high"].map((p) => `<option value="${p}" ${(t?.priority || "normal") === p ? "selected" : ""}>${p[0].toUpperCase() + p.slice(1)}</option>`).join("")}</select></label></div>
      <label class="field"><span>Due date</span><input type="date" name="due_date" value="${esc(t?.due_date || "")}"/></label>
      <div class="modal-actions">${isNew ? "" : `<button class="danger-button" type="button" data-delete="${esc(t.id)}">${icon("trash", 16)} Delete</button>`}<span class="spacer"></span><button class="secondary-button" type="button" data-close="true">Cancel</button><button class="primary-button" type="submit" ${state.busy ? "disabled" : ""}>${isNew ? "Create task" : "Save changes"} ${icon("arrow", 16)}</button></div>
    </form>
  </div></div>`;
}
function render() {
  const all = state.tasks.length,
    done = state.tasks.filter((t) => t.status === "done").length;
  const overdue = state.tasks.filter(
    (t) => t.status !== "done" && t.due_date && t.due_date < today(),
  ).length;
  $("#app").innerHTML =
    `<div class="shell"><main class="main"><header class="topbar"><div class="breadcrumb"><strong>Board</strong></div><span class="date-label">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span></header>
    <div class="content"><div class="hero"><h1>Task Board</h1><button class="primary-button hero-button" type="button" id="new-task">${icon("plus", 18)} New task</button></div>
    <div class="stats"><div class="stat"><span>Total tasks</span><strong>${all.toString().padStart(2, "0")}</strong></div><div class="stat"><span>In progress</span><strong>${state.tasks
      .filter((t) => t.status === "in_progress" || t.status === "in_review")
      .length.toString()
      .padStart(
        2,
        "0",
      )}</strong></div><div class="stat"><span>Completed</span><strong>${done.toString().padStart(2, "0")}</strong></div><div class="stat"><span>Overdue</span><strong class="${overdue ? "warning-text" : ""}">${overdue.toString().padStart(2, "0")}</strong></div></div>
    <div class="board-toolbar"><div class="toolbar-title"><h2>Tasks</h2><span>${all} ${all === 1 ? "task" : "tasks"}</span></div><div class="toolbar-controls"><label class="search-box">${icon("search", 17)}<input id="search" type="search" placeholder="Search tasks" value="${esc(state.query)}" aria-label="Search tasks"/></label><label class="filter-box">${icon("filter", 16)}<select id="priority-filter" aria-label="Filter by priority"><option value="all" ${state.priority === "all" ? "selected" : ""}>All priorities</option><option value="high" ${state.priority === "high" ? "selected" : ""}>High priority</option><option value="normal" ${state.priority === "normal" ? "selected" : ""}>Normal priority</option><option value="low" ${state.priority === "low" ? "selected" : ""}>Low priority</option></select></label></div></div>
    ${state.error ? `<div class="error-banner" role="alert">${esc(state.error)} <button id="retry">Retry</button></div>` : ""}
    ${state.loading ? '<div class="loading-board" aria-live="polite">Loading tasks…</div>' : board()}
    <footer class="footer">${isLocal() ? "Preview mode · Saved in this browser" : "Tasks are private to this guest session"}</footer>
    </div></main></div>${modal()}${state.toast ? `<div class="toast" role="status">${icon("check", 16)} ${esc(state.toast)}</div>` : ""}`;
  bind();
}
function toast(message) {
  state.toast = message;
  render();
  setTimeout(() => {
    state.toast = "";
    $(".toast")?.remove();
  }, 2600);
}
function openModal(id = "new", status = "todo") {
  state.selected = id;
  state.newStatus = status;
  render();
  setTimeout(() => $('[name="title"]')?.focus(), 20);
}
async function fetchTasks() {
  state.error = "";
  state.loading = true;
  render();
  if (!connected) {
    loadLocal();
  } else {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      let active = session;
      if (!active) {
        const { data, error } = await client.auth.signInAnonymously();
        if (error) throw error;
        active = data.session;
      }
      state.user = active.user;
      state.previewFallback = false;
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      state.tasks = data || [];
    } catch (error) {
      if (error.code === "anonymous_provider_disabled") {
        state.previewFallback = true;
        loadLocal();
        state.error = "Guest sign-in disabled. Preview mode is active.";
      } else state.error = `Could not load your board: ${error.message}`;
    }
  }
  state.loading = false;
  render();
}
async function persist(method, payload, id) {
  if (isLocal()) {
    if (method === "insert")
      state.tasks.push({
        ...payload,
        id: uid(),
        created_at: new Date().toISOString(),
      });
    if (method === "update")
      state.tasks = state.tasks.map((t) =>
        t.id === id ? { ...t, ...payload } : t,
      );
    if (method === "delete")
      state.tasks = state.tasks.filter((t) => t.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(state.tasks));
    return;
  }
  let result;
  if (method === "insert")
    result = await client
      .from("tasks")
      .insert({ ...payload, user_id: state.user.id })
      .select()
      .single();
  if (method === "update")
    result = await client
      .from("tasks")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  if (method === "delete")
    result = await client.from("tasks").delete().eq("id", id);
  if (result.error) throw result.error;
  if (method === "insert") state.tasks.push(result.data);
  if (method === "update")
    state.tasks = state.tasks.map((t) => (t.id === id ? result.data : t));
  if (method === "delete") state.tasks = state.tasks.filter((t) => t.id !== id);
}
async function saveTask(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const id = values.id;
  delete values.id;
  values.title = values.title.trim();
  values.description = values.description.trim();
  values.due_date ||= null;
  if (!values.title) return;
  state.busy = true;
  try {
    await persist(id ? "update" : "insert", values, id);
    state.selected = null;
    toast(id ? "Task updated" : "Task created");
  } catch (error) {
    state.error = `Could not save task: ${error.message}`;
    render();
  } finally {
    state.busy = false;
  }
}
async function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  try {
    await persist("delete", null, id);
    state.selected = null;
    toast("Task deleted");
  } catch (error) {
    state.error = `Could not delete task: ${error.message}`;
    render();
  }
}
async function moveTask(id, status) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task || task.status === status) return;
  try {
    await persist("update", { status }, id);
    toast(`Moved to ${STATUSES.find((s) => s.key === status).label}`);
  } catch (error) {
    state.error = `Could not move task: ${error.message}`;
    render();
  }
}
function bind() {
  $("#new-task")?.addEventListener("click", () => openModal());
  document
    .querySelectorAll("[data-add]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openModal("new", button.dataset.add),
      ),
    );
  document.querySelectorAll("[data-task]").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.task));
    button.addEventListener("dragstart", (event) => {
      state.dragging = button.dataset.task;
      button.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", state.dragging);
    });
    button.addEventListener("dragend", () => {
      state.dragging = null;
      document
        .querySelectorAll(".column")
        .forEach((c) => c.classList.remove("drag-over"));
      button.classList.remove("dragging");
    });
  });
  document.querySelectorAll(".column").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("drag-over");
    });
    column.addEventListener("dragleave", (event) => {
      if (!column.contains(event.relatedTarget))
        column.classList.remove("drag-over");
    });
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      column.classList.remove("drag-over");
      moveTask(
        event.dataTransfer.getData("text/plain") || state.dragging,
        column.dataset.status,
      );
    });
  });
  $("#search")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    const position = event.target.selectionStart;
    render();
    $("#search").focus();
    $("#search").setSelectionRange(position, position);
  });
  $("#priority-filter")?.addEventListener("change", (event) => {
    state.priority = event.target.value;
    render();
  });
  $("#task-form")?.addEventListener("submit", saveTask);
  $("[data-delete]")?.addEventListener("click", (event) =>
    deleteTask(event.currentTarget.dataset.delete),
  );
  document.querySelectorAll("[data-close]").forEach((button) =>
    button.addEventListener("click", (event) => {
      if (event.target === button || button.tagName === "BUTTON") {
        state.selected = null;
        render();
      }
    }),
  );
  $("#retry")?.addEventListener("click", fetchTasks);
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.selected) {
    state.selected = null;
    render();
  }
});
render();
fetchTasks();
