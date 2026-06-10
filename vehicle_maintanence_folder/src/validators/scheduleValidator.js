function validateScheduleRequest(body) {
  const { mechanic_hours, vehicles } = body;

  if (mechanic_hours === undefined) return { valid: false, message: '"mechanic_hours" is required.' };
  if (typeof mechanic_hours !== 'number' || !Number.isFinite(mechanic_hours)) return { valid: false, message: '"mechanic_hours" must be a finite number.' };
  if (mechanic_hours < 0) return { valid: false, message: '"mechanic_hours" must be non-negative.' };
  if (!Number.isInteger(mechanic_hours)) return { valid: false, message: '"mechanic_hours" must be an integer.' };
  if (!Array.isArray(vehicles)) return { valid: false, message: '"vehicles" must be an array.' };

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v || typeof v !== 'object') return { valid: false, message: `vehicles[${i}] must be an object.` };
    if (!Number.isInteger(v.duration) || v.duration <= 0) return { valid: false, message: `vehicles[${i}].duration must be a positive integer.` };
    if (typeof v.impact_score !== 'number' || v.impact_score <= 0) return { valid: false, message: `vehicles[${i}].impact_score must be positive.` };
  }

  return { valid: true };
}

module.exports = { validateScheduleRequest };
