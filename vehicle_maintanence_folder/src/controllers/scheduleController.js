const { validateScheduleRequest } = require('../validators/scheduleValidator');
const { optimizeAllDepots, optimizeCustom } = require('../services/scheduleService');
const { Log } = require('../../../logging_middleware/index');

async function optimizeFromAPI(req, res) {
  try {
    await Log('backend', 'info', 'controller', 'GET /api/schedule/optimize - fetching from evaluation API');
    const results = await optimizeAllDepots();
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    await Log('backend', 'error', 'controller', `optimizeFromAPI failed: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function optimizeCustom_(req, res) {
  const validation = validateScheduleRequest(req.body);
  if (!validation.valid) {
    await Log('backend', 'warn', 'controller', `Validation failed: ${validation.message}`);
    return res.status(400).json({ success: false, error: validation.message });
  }

  try {
    const { mechanic_hours, vehicles } = req.body;
    const result = await optimizeCustom(mechanic_hours, vehicles);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    await Log('backend', 'error', 'controller', `optimizeCustom failed: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { optimizeFromAPI, optimizeCustom: optimizeCustom_ };
