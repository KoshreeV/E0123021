const http = require('http');

const BASE = 'http://4.224.186.213/evaluation-service';

const VALID_STACKS = ['backend', 'frontend'];
const VALID_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const VALID_PACKAGES = ['cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service'];

let cachedToken = null;
let tokenFetchPromise = null;

function httpPost(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(`${BASE}${path}`);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname,
      method: 'POST',
      headers,
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function fetchToken() {
  const body = {
    email: process.env.EMAIL,
    name: process.env.NAME,
    rollNo: process.env.ROLL_NO,
    accessCode: process.env.ACCESS_CODE,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  };
  const res = await httpPost('/auth', body);
  if (!res.access_token) throw new Error(`Auth failed: ${JSON.stringify(res)}`);
  return res.access_token;
}

async function getToken() {
  if (cachedToken) return cachedToken;
  if (!tokenFetchPromise) {
    tokenFetchPromise = fetchToken()
      .then((t) => { cachedToken = t; tokenFetchPromise = null; return t; })
      .catch((e) => { tokenFetchPromise = null; throw e; });
  }
  return tokenFetchPromise;
}

async function Log(stack, level, pkg, message) {
  if (!VALID_STACKS.includes(stack)) return;
  if (!VALID_LEVELS.includes(level)) return;
  if (!VALID_PACKAGES.includes(pkg)) return;

  try {
    const token = await getToken();
    await httpPost('/logs', { stack, level, package: pkg, message }, token);
  } catch (_) { }
}

function expressLogger(req, res, next) {
  const start = Date.now();
  Log('backend', 'info', 'handler', `${req.method} ${req.originalUrl} received`);

  const orig = res.json.bind(res);
  res.json = function (body) {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    Log('backend', level, 'handler', `${req.method} ${req.originalUrl} responded ${res.statusCode} in ${Date.now() - start}ms`);
    return orig(body);
  };
  next();
}

function errorLogger(err, req, _res, next) {
  Log('backend', 'error', 'handler', `Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`);
  next(err);
}

module.exports = { Log, expressLogger, errorLogger };
