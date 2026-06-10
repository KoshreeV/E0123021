const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../db/database');
const { Log } = require('../../../logging_middleware/index');
const { PriorityInbox } = require('../utils/priorityInbox');

const CACHE_TTL = 30000;
const cache = new Map();

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) { cache.delete(key); return null; }
  return e.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, exp: Date.now() + CACHE_TTL });
}

function cacheInvalidate(studentId) {
  for (const k of cache.keys()) {
    if (k.startsWith(`n:${studentId}:`)) cache.delete(k);
  }
}

function deserialize(row) {
  if (!row) return null;
  return { ...row, is_read: row.is_read === 1 || row.is_read === true, metadata: row.metadata ? JSON.parse(row.metadata) : {} };
}

function createNotification({ student_id, type, title, body, priority = 0, metadata = {} }) {
  const id = uuidv4();
  run(
    'INSERT INTO notifications (id, student_id, type, title, body, priority, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, student_id, type, title, body, priority, JSON.stringify(metadata)]
  );
  cacheInvalidate(student_id);
  Log('backend', 'info', 'service', `Notification created: ${id}`).catch(() => {});
  return deserialize(queryOne('SELECT * FROM notifications WHERE id = ?', [id]));
}

function getNotificationById(id) {
  return deserialize(queryOne('SELECT * FROM notifications WHERE id = ?', [id]));
}

function getNotificationsForStudent(studentId, options = {}) {
  const { page = 1, page_size = 20, filter = 'all', sort = 'timestamp' } = options;
  const key = `n:${studentId}:${page}:${page_size}:${filter}:${sort}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const offset = (page - 1) * page_size;
  const conds = ['student_id = ?'];
  const params = [studentId];
  if (filter === 'read') conds.push('is_read = 1');
  if (filter === 'unread') conds.push('is_read = 0');

  const where = conds.join(' AND ');
  const order = sort === 'priority' ? 'priority DESC, created_at DESC' : 'created_at DESC';

  const rows = query(
    `SELECT id, student_id, type, title, body, priority, is_read, created_at, read_at, metadata FROM notifications WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, page_size, offset]
  );
  const total = (queryOne(`SELECT COUNT(*) AS total FROM notifications WHERE ${where}`, params) || {}).total || 0;

  const result = {
    data: rows.map(deserialize),
    pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size), has_next: page * page_size < total, has_prev: page > 1 },
  };
  cacheSet(key, result);
  return result;
}

function getRecentPlacementNotifications(studentId) {
  const rows = query(
    `SELECT id, student_id, type, title, body, priority, is_read, created_at FROM notifications WHERE student_id = ? AND type = 'placement' AND created_at >= datetime('now', '-7 days') ORDER BY created_at DESC`,
    [studentId]
  );
  return rows.map(deserialize);
}

function markNotificationAsRead(id) {
  const existing = getNotificationById(id);
  if (!existing) return null;
  run(`UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE id = ?`, [id]);
  cacheInvalidate(existing.student_id);
  return getNotificationById(id);
}

function fetchStudentPage(offset, limit) {
  return query('SELECT id, email FROM students LIMIT ? OFFSET ?', [limit, offset]);
}

function createStudent({ id, name, email }) {
  const sid = id || uuidv4();
  run('INSERT OR IGNORE INTO students (id, name, email) VALUES (?, ?, ?)', [sid, name, email]);
  return queryOne('SELECT * FROM students WHERE id = ?', [sid]);
}

const inboxes = new Map();

function getOrCreateInbox(studentId) {
  if (!inboxes.has(studentId)) inboxes.set(studentId, new PriorityInbox(10));
  return inboxes.get(studentId);
}

function addToInbox(studentId, notification) {
  getOrCreateInbox(studentId).add(notification);
}

function getTopNotifications(studentId) {
  const inbox = getOrCreateInbox(studentId);
  inbox.refresh();
  return inbox.getTopN();
}

function bootstrapInbox(studentId) {
  const rows = query(
    'SELECT id, student_id, type, title, priority, created_at FROM notifications WHERE student_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 100',
    [studentId]
  );
  const inbox = new PriorityInbox(10);
  rows.map(deserialize).forEach(n => inbox.add(n));
  inboxes.set(studentId, inbox);
}

module.exports = {
  createNotification, getNotificationById, getNotificationsForStudent,
  getRecentPlacementNotifications, markNotificationAsRead, fetchStudentPage,
  createStudent, addToInbox, getTopNotifications, bootstrapInbox,
};
