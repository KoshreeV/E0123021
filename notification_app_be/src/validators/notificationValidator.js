const VALID_TYPES = ['placement', 'result', 'event', 'general'];

function err(message) { return { valid: false, message }; }

function validateSendNotification(body) {
  const { student_id, type, title, body: msg } = body;
  if (!student_id || typeof student_id !== 'string') return err('"student_id" is required.');
  if (!VALID_TYPES.includes(type)) return err(`"type" must be one of: ${VALID_TYPES.join(', ')}.`);
  if (!title || typeof title !== 'string') return err('"title" is required.');
  if (!msg || typeof msg !== 'string') return err('"body" is required.');
  return { valid: true };
}

function validateFetchParams(query) {
  if (query.page !== undefined && (isNaN(query.page) || Number(query.page) < 1)) return err('"page" must be a positive integer.');
  if (query.page_size !== undefined) {
    const ps = Number(query.page_size);
    if (!Number.isInteger(ps) || ps < 1 || ps > 100) return err('"page_size" must be 1–100.');
  }
  if (query.filter !== undefined && !['read', 'unread', 'all'].includes(query.filter)) return err('"filter" must be read, unread, or all.');
  if (query.sort !== undefined && !['timestamp', 'priority'].includes(query.sort)) return err('"sort" must be timestamp or priority.');
  return { valid: true };
}

function validateBulkNotification(body) {
  const { type, title, body: msg } = body;
  if (!VALID_TYPES.includes(type)) return err(`"type" must be one of: ${VALID_TYPES.join(', ')}.`);
  if (!title || typeof title !== 'string') return err('"title" is required.');
  if (!msg || typeof msg !== 'string') return err('"body" is required.');
  return { valid: true };
}

module.exports = { validateSendNotification, validateFetchParams, validateBulkNotification };
