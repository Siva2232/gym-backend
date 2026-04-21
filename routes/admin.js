import express from 'express';
import {
  getDashboard, getTrainers, createTrainer, updateTrainer, deleteTrainer,
  getAllCustomers, toggleUserStatus, assignTrainer, broadcastNotification,
  getSubscription, updateSubscription,
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { authorize, gymIsolation } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(protect, authorize('admin'), gymIsolation);

router.get('/dashboard', getDashboard);

router.get('/trainers', getTrainers);
router.post('/trainers', createTrainer);
router.put('/trainers/:id', updateTrainer);
router.delete('/trainers/:id', deleteTrainer);

router.get('/customers', getAllCustomers);
router.patch('/customers/:customerId/assign', assignTrainer);

router.patch('/users/:id/toggle', toggleUserStatus);

router.post('/broadcast', broadcastNotification);

router.get('/subscription', getSubscription);
router.put('/subscription', updateSubscription);

export default router;
