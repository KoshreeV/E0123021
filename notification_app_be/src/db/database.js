const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { Log } = require('../../../logging_middleware/index');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/notifications.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db = null;

async function initDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.run(schema);
  persist();
  await Log('backend', 'info', 'db', 'Database initialised');
  return db;
}

function persist() {
  if (db) fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function getDb() {
  if (!db) throw new Error('DB not initialised');
  return db;
}

function closeDb() {
  if (db) { persist(); db.close(); db = null; }
}

function query(sql, params = []) {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  return query(sql, params)[0];
}

function run(sql, params = []) {
  getDb().run(sql, params);
  persist();
}

module.exports = { initDb, getDb, closeDb, query, queryOne, run };
