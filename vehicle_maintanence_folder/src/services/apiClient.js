const http = require('http');
const { Log } = require('../../../logging_middleware/index');

const BASE = 'http://4.224.186.213/evaluation-service';

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const token = process.env.ACCESS_TOKEN;
    if (!token) {
      reject(new Error('ACCESS_TOKEN not set'));
      return;
    }
    const u = new URL(`${BASE}${path}`);
    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error(`Invalid JSON response from ${path}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchDepots() {
  await Log('backend', 'info', 'service', 'Fetching depots from evaluation API');
  const data = await httpGet('/depots');
  return data.depots || data;
}

async function fetchVehicles() {
  await Log('backend', 'info', 'service', 'Fetching vehicles from evaluation API');
  const data = await httpGet('/vehicles');
  return data.vehicles || data;
}

module.exports = { fetchDepots, fetchVehicles };
