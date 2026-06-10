const express = require('express');
const { expressLogger, errorLogger } = require('../../logging_middleware/index');
const scheduleRoutes = require('./routes/scheduleRoutes');

const app = express();

app.use(express.json());
app.use(expressLogger);

app.use('/api/schedule', scheduleRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'vehicle-maintenance-scheduler' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

app.use(errorLogger);
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ success: false, error: err.message });
});

module.exports = app;
