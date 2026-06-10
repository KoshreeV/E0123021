const {
  createNotification, getNotificationsForStudent, getRecentPlacementNotifications,
  markNotificationAsRead, fetchStudentPage, createStudent,
  addToInbox, getTopNotifications, bootstrapInbox,
} = require('../services/notificationService');
const { fetchNotificationsFromAPI } = require('../services/apiClient');
const { sendBulkNotification, getDLQ } = require('../utils/bulkSender');
const { validateSendNotification, validateFetchParams, validateBulkNotification } = require('../validators/notificationValidator');
const { Log } = require('../../../logging_middleware/index');

const sseClients = new Map();

function pushSSE(studentId, notification) {
  const clients = sseClients.get(studentId);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(notification)}\n\n`;
  for (const client of clients) {
    try { client.write(payload); } catch (_) { }
  }
}

async function getEvaluationNotifications(req, res) {
  try {
    await Log('backend', 'info', 'controller', 'Fetching notifications from evaluation API');
    const notifications = await fetchNotificationsFromAPI();
    await Log('backend', 'info', 'service', `Fetched ${notifications.length} notifications from evaluation API`);
    return res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    await Log('backend', 'error', 'controller', `getEvaluationNotifications failed: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function sendNotification(req, res) {
  const v = validateSendNotification(req.body);
  if (!v.valid) {
    await Log('backend', 'warn', 'controller', `sendNotification validation failed: ${v.message}`);
    return res.status(400).json({ success: false, error: v.message });
  }
  try {
    const { student_id, type, title, body, priority, metadata } = req.body;
    const notification = createNotification({ student_id, type, title, body, priority, metadata });
    addToInbox(student_id, notification);
    pushSSE(student_id, notification);
    await Log('backend', 'info', 'controller', `Notification ${notification.id} sent to student ${student_id}`);
    return res.status(201).json({ success: true, data: notification });
  } catch (err) {
    await Log('backend', 'error', 'controller', `sendNotification error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getNotifications(req, res) {
  const v = validateFetchParams(req.query);
  if (!v.valid) {
    await Log('backend', 'warn', 'controller', `getNotifications validation failed: ${v.message}`);
    return res.status(400).json({ success: false, error: v.message });
  }
  try {
    const { studentId } = req.params;
    await Log('backend', 'info', 'controller', `Fetching notifications for student ${studentId}`);
    const result = getNotificationsForStudent(studentId, {
      page: Number(req.query.page) || 1,
      page_size: Number(req.query.page_size) || 20,
      filter: req.query.filter || 'all',
      sort: req.query.sort || 'timestamp',
    });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    await Log('backend', 'error', 'controller', `getNotifications error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function markAsRead(req, res) {
  try {
    await Log('backend', 'info', 'controller', `Marking notification ${req.params.id} as read`);
    const updated = markNotificationAsRead(req.params.id);
    if (!updated) {
      await Log('backend', 'warn', 'controller', `Notification ${req.params.id} not found`);
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    await Log('backend', 'error', 'controller', `markAsRead error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getPriorityInbox(req, res) {
  try {
    const { studentId } = req.params;
    await Log('backend', 'info', 'controller', `Getting priority inbox for student ${studentId}`);
    bootstrapInbox(studentId);
    const top = getTopNotifications(studentId);
    return res.status(200).json({ success: true, data: top });
  } catch (err) {
    await Log('backend', 'error', 'controller', `getPriorityInbox error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getPlacementNotifications(req, res) {
  try {
    const { studentId } = req.params;
    await Log('backend', 'info', 'controller', `Fetching placement notifications for student ${studentId}`);
    const data = getRecentPlacementNotifications(studentId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    await Log('backend', 'error', 'controller', `getPlacementNotifications error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function sendBulk(req, res) {
  const v = validateBulkNotification(req.body);
  if (!v.valid) {
    await Log('backend', 'warn', 'controller', `sendBulk validation failed: ${v.message}`);
    return res.status(400).json({ success: false, error: v.message });
  }
  res.status(202).json({ success: true, message: 'Bulk notification job accepted.' });
  const message = { type: req.body.type, title: req.body.title, body: req.body.body };
  const mockDeliver = async () => {
    if (Math.random() < 0.05) throw new Error('Simulated transient failure');
  };
  sendBulkNotification(message, fetchStudentPage, mockDeliver).catch(() => { });
}

async function viewDLQ(_req, res) {
  return res.status(200).json({ success: true, data: getDLQ() });
}

async function createStudentHandler(req, res) {
  const { id, name, email } = req.body;
  if (!name || !email) {
    await Log('backend', 'warn', 'controller', 'createStudent missing name or email');
    return res.status(400).json({ success: false, error: '"name" and "email" are required.' });
  }
  try {
    const student = createStudent({ id, name, email });
    await Log('backend', 'info', 'controller', `Student created: ${student.id}`);
    return res.status(201).json({ success: true, data: student });
  } catch (err) {
    await Log('backend', 'error', 'controller', `createStudent error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function streamNotifications(req, res) {
  const { studentId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  await Log('backend', 'info', 'controller', `SSE stream opened for student ${studentId}`);

  if (!sseClients.has(studentId)) sseClients.set(studentId, new Set());
  sseClients.get(studentId).add(res);

  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch { clearInterval(ping); } }, 30000);
  req.on('close', () => {
    clearInterval(ping);
    sseClients.get(studentId)?.delete(res);
  });
}

module.exports = {
  getEvaluationNotifications, sendNotification, getNotifications,
  markAsRead, getPriorityInbox, getPlacementNotifications,
  sendBulk, viewDLQ, createStudentHandler, streamNotifications,
};
