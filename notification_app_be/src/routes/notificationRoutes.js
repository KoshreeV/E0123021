const { Router } = require('express');
const {
  getEvaluationNotifications, sendNotification, getNotifications,
  markAsRead, getPriorityInbox, getPlacementNotifications,
  sendBulk, viewDLQ, createStudentHandler, streamNotifications,
} = require('../controllers/notificationController');

const router = Router();

router.post('/students', createStudentHandler);

router.get('/from-api', getEvaluationNotifications);
router.post('/bulk', sendBulk);
router.get('/dlq', viewDLQ);

router.post('/', sendNotification);

router.get('/:studentId/stream', streamNotifications);
router.get('/:studentId/priority', getPriorityInbox);
router.get('/:studentId/placement', getPlacementNotifications);
router.get('/:studentId', getNotifications);
router.patch('/:id/read', markAsRead);

module.exports = router;
