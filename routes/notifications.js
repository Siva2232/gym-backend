import express from 'express';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, createNotification } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.post('/', authorize('trainer', 'admin'), createNotification);

export default router;
