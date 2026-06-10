const { v4: uuidv4 } = require('uuid');
const { Log } = require('../../../logging_middleware/index');

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const BASE_DELAY = 200;

const deadLetterQueue = [];

function getDLQ() { return [...deadLetterQueue]; }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendWithRetry(deliverFn, payload) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await deliverFn(payload);
      return { success: true, attempts: attempt };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 100);
      } else {
        return { success: false, attempts: attempt, error: err.message };
      }
    }
  }
}

async function sendBulkNotification(message, fetchStudentPage, deliverFn) {
  const jobId = uuidv4();
  const stats = { total: 0, succeeded: 0, failed: 0 };
  let offset = 0;

  await Log('backend', 'info', 'service', `Bulk send job started: ${jobId}`);

  while (true) {
    const students = await fetchStudentPage(offset, BATCH_SIZE);
    if (!students || students.length === 0) break;

    await Promise.allSettled(students.map(async (student) => {
      const payload = { notification_id: uuidv4(), job_id: jobId, student_id: student.id, email: student.email, ...message };
      const result = await sendWithRetry(deliverFn, payload);
      stats.total++;
      if (result.success) {
        stats.succeeded++;
      } else {
        stats.failed++;
        deadLetterQueue.push({ ...payload, error: result.error, dlq_at: new Date().toISOString() });
        await Log('backend', 'warn', 'service', `DLQ: failed for student ${student.id}`);
      }
    }));

    offset += students.length;
    if (students.length < BATCH_SIZE) break;
  }

  await Log('backend', 'info', 'service', `Bulk job ${jobId} done: ${JSON.stringify(stats)}`);
  return { jobId, stats };
}

module.exports = { sendBulkNotification, getDLQ };
