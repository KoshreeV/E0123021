const { Router } = require('express');
const { optimizeFromAPI, optimizeCustom } = require('../controllers/scheduleController');

const router = Router();

router.get('/optimize', optimizeFromAPI);
router.post('/optimize', optimizeCustom);

module.exports = router;
