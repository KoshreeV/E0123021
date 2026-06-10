require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const app = require('./app');
const { initDb, closeDb } = require('./db/database');
const { Log } = require('../../logging_middleware/index');

const PORT = process.env.PORT || 3002;

(async () => {
  await initDb();
  const server = app.listen(PORT, () => {
    Log('backend', 'info', 'service', `Campus Notification Service started on port ${PORT}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => { closeDb(); process.exit(0); });
  });
})();
