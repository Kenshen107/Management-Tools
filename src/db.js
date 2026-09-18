const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const EMPTY_STATE = {
  notices: [],
  topics: [],
  employees: [],
  assignments: [],
  topicConfirmations: [],
};

function load() {
  if (!fs.existsSync(DB_PATH)) {
    save(EMPTY_STATE);
    return structuredClone(EMPTY_STATE);
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  if (!raw.trim()) return structuredClone(EMPTY_STATE);
  return JSON.parse(raw);
}

function save(state) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
}

// Simple synchronous read-modify-write wrapper. Traffic on this tool is a
// handful of managers/employees at a time, so a naive in-process lock via
// a module-level cache is more than sufficient and keeps the whole thing
// dependency-free (no native modules to compile).
let state = load();

function persist() {
  save(state);
}

function nowIso() {
  return new Date().toISOString();
}

// ---- Notices ----

function createNotice({ title, description, senderName, senderEmail }) {
  const notice = {
    id: uuid(),
    title,
    description: description || '',
    senderName: senderName || '',
    senderEmail: senderEmail || '',
    createdAt: nowIso(),
  };
  state.notices.push(notice);
  persist();
  return notice;
}

function getNotice(id) {
  return state.notices.find((n) => n.id === id);
}

function listNotices() {
  return [...state.notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---- Topics ----

function addTopic(noticeId, { title, body, signOffPrompt }) {
  const topicsForNotice = state.topics.filter((t) => t.noticeId === noticeId);
  const topic = {
    id: uuid(),
    noticeId,
    position: topicsForNotice.length,
    title,
    body,
    signOffPrompt: signOffPrompt && signOffPrompt.trim()
      ? signOffPrompt.trim()
      : 'I have read and understand this.',
    createdAt: nowIso(),
  };
  state.topics.push(topic);
  persist();
  return topic;
}

function removeTopic(noticeId, topicId) {
  state.topics = state.topics.filter((t) => !(t.noticeId === noticeId && t.id === topicId));
  state.topicConfirmations = state.topicConfirmations.filter((c) => c.topicId !== topicId);
  persist();
}

function listTopics(noticeId) {
  return state.topics
    .filter((t) => t.noticeId === noticeId)
    .sort((a, b) => a.position - b.position);
}

function getTopic(topicId) {
  return state.topics.find((t) => t.id === topicId);
}

// ---- Employees ----

function upsertEmployee({ name, email }) {
  const normEmail = email.trim().toLowerCase();
  let employee = state.employees.find((e) => e.email === normEmail);
  if (!employee) {
    employee = { id: uuid(), name: name.trim(), email: normEmail, createdAt: nowIso() };
    state.employees.push(employee);
    persist();
  } else if (name && name.trim() && employee.name !== name.trim()) {
    employee.name = name.trim();
    persist();
  }
  return employee;
}

function listEmployees() {
  return [...state.employees].sort((a, b) => a.name.localeCompare(b.name));
}

function getEmployee(id) {
  return state.employees.find((e) => e.id === id);
}

// ---- Assignments (a notice sent to one employee) ----

function assignNotice(noticeId, employeeId) {
  let assignment = state.assignments.find(
    (a) => a.noticeId === noticeId && a.employeeId === employeeId
  );
  if (assignment) return assignment;

  assignment = {
    id: uuid(),
    noticeId,
    employeeId,
    token: uuid(),
    createdAt: nowIso(),
    sentAt: null,
    firstOpenedAt: null,
    lastOpenedAt: null,
    completedAt: null,
  };
  state.assignments.push(assignment);

  // Create a pending confirmation row for every topic that exists right now.
  const topics = listTopics(noticeId);
  for (const topic of topics) {
    state.topicConfirmations.push({
      id: uuid(),
      assignmentId: assignment.id,
      topicId: topic.id,
      viewedAt: null,
      scrolledAt: null,
      confirmedAt: null,
      signatureText: null,
    });
  }
  persist();
  return assignment;
}

function getAssignment(id) {
  return state.assignments.find((a) => a.id === id);
}

function getAssignmentByToken(token) {
  return state.assignments.find((a) => a.token === token);
}

function listAssignmentsForNotice(noticeId) {
  return state.assignments.filter((a) => a.noticeId === noticeId);
}

function markSent(assignmentId) {
  const a = getAssignment(assignmentId);
  if (a) {
    a.sentAt = nowIso();
    persist();
  }
  return a;
}

function markOpened(assignmentId) {
  const a = getAssignment(assignmentId);
  if (a) {
    if (!a.firstOpenedAt) a.firstOpenedAt = nowIso();
    a.lastOpenedAt = nowIso();
    persist();
  }
  return a;
}

// ---- Topic confirmations ----

function listConfirmationsForAssignment(assignmentId) {
  return state.topicConfirmations.filter((c) => c.assignmentId === assignmentId);
}

function getConfirmation(assignmentId, topicId) {
  return state.topicConfirmations.find(
    (c) => c.assignmentId === assignmentId && c.topicId === topicId
  );
}

function markTopicViewed(assignmentId, topicId) {
  const c = getConfirmation(assignmentId, topicId);
  if (c && !c.viewedAt) {
    c.viewedAt = nowIso();
    persist();
  }
  return c;
}

function markTopicScrolled(assignmentId, topicId) {
  const c = getConfirmation(assignmentId, topicId);
  if (c && !c.scrolledAt) {
    c.scrolledAt = nowIso();
    persist();
  }
  return c;
}

function confirmTopic(assignmentId, topicId, signatureText) {
  const c = getConfirmation(assignmentId, topicId);
  if (!c) return null;
  c.confirmedAt = nowIso();
  c.signatureText = signatureText;
  persist();

  // If every topic for this assignment is now confirmed, mark the
  // assignment itself complete.
  const all = listConfirmationsForAssignment(assignmentId);
  if (all.every((row) => row.confirmedAt)) {
    const assignment = getAssignment(assignmentId);
    if (assignment && !assignment.completedAt) {
      assignment.completedAt = nowIso();
      persist();
    }
  }
  return c;
}

module.exports = {
  createNotice,
  getNotice,
  listNotices,
  addTopic,
  removeTopic,
  listTopics,
  getTopic,
  upsertEmployee,
  listEmployees,
  getEmployee,
  assignNotice,
  getAssignment,
  getAssignmentByToken,
  listAssignmentsForNotice,
  markSent,
  markOpened,
  listConfirmationsForAssignment,
  getConfirmation,
  markTopicViewed,
  markTopicScrolled,
  confirmTopic,
};
