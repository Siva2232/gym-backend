import express from 'express';
import {
  getTrainerDashboard, getMyCustomers, createCustomer,
  updateCustomer, getCustomerDetail, markAttendance,
} from '../controllers/trainerController.js';
import { protect } from '../middleware/auth.js';
import { authorize, gymIsolation } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(protect, authorize('trainer', 'admin'), gymIsolation);

router.get('/dashboard', getTrainerDashboard);

router.get('/customers', getMyCustomers);
router.post('/customers', createCustomer);
router.get('/customers/:id', getCustomerDetail);
router.put('/customers/:id', updateCustomer);

router.post('/customers/:id/attendance', markAttendance);

export default router;
