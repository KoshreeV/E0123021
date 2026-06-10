function solveKnapsack(budget, vehicles) {
  const n = vehicles.length;
  if (n === 0 || budget === 0) return buildResult([], budget);

  const feasible = vehicles.filter(v => v.duration <= budget);
  if (feasible.length === 0) return buildResult([], budget);

  const W = budget;
  const m = feasible.length;
  const dp = Array.from({ length: m + 1 }, () => new Float64Array(W + 1));

  for (let i = 1; i <= m; i++) {
    const { duration, impact_score } = feasible[i - 1];
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];
      if (duration <= w) {
        const with_item = dp[i - 1][w - duration] + impact_score;
        if (with_item > dp[i][w]) dp[i][w] = with_item;
      }
    }
  }

  const selected = [];
  let w = W;
  for (let i = m; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(feasible[i - 1]);
      w -= feasible[i - 1].duration;
    }
  }

  return buildResult(selected, budget);
}

function buildResult(selected, budget) {
  const total_score = selected.reduce((s, v) => s + v.impact_score, 0);
  const total_hours_used = selected.reduce((s, v) => s + v.duration, 0);
  return {
    selected_vehicles: selected,
    total_score: parseFloat(total_score.toFixed(4)),
    total_hours_used,
    hours_remaining: budget - total_hours_used,
  };
}

module.exports = { solveKnapsack };
