require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const app = require('./app');
const { Log } = require('../../logging_middleware/index');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  Log('backend', 'info', 'service', `Vehicle Maintenance Scheduler started on port ${PORT}`);
});
