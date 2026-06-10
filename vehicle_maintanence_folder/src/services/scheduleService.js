const { solveKnapsack } = require('../optimizer/knapsack');
const { fetchDepots, fetchVehicles } = require('./apiClient');
const { Log } = require('../../../logging_middleware/index');

async function optimizeAllDepots() {
  const [depots, vehicles] = await Promise.all([fetchDepots(), fetchVehicles()]);

  await Log('backend', 'info', 'service', `Running optimization: ${depots.length} depots, ${vehicles.length} vehicles`);

  const mappedVehicles = vehicles.map((v) => ({
    id: v.TaskID,
    duration: Number(v.Duration),
    impact_score: Number(v.Impact),
  }));

  return depots.map((depot) => {
    const budget = Number(depot.MechanicHours);
    const result = solveKnapsack(budget, mappedVehicles);
    return {
      depot_id: depot.ID,
      mechanic_hours: budget,
      ...result,
    };
  });
}

async function optimizeCustom(mechanic_hours, vehicles) {
  const mapped = vehicles.map((v, i) => ({
    id: v.id || `v${i + 1}`,
    duration: Number(v.duration),
    impact_score: Number(v.impact_score),
  }));
  await Log('backend', 'info', 'service', `Custom optimization: budget=${mechanic_hours}`);
  return solveKnapsack(mechanic_hours, mapped);
}

module.exports = { optimizeAllDepots, optimizeCustom };
