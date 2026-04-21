import express from 'express';
import { getProgress, addMeasurement, getAttendance, getAllProgress } from '../controllers/progressController.js';
import { protect } from '../middleware/auth.js';
import { gymIsolation, authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(protect, gymIsolation);

// Customer: get own progress
router.get('/my', async (req, res) => {
  try {
    const { default: Progress } = await import('../models/Progress.js');
    const progress = await Progress.findOne({ customerId: req.user._id, gymId: req.user.gymId });
    res.json({ success: true, data: progress });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/', getAllProgress);
router.get('/:customerId', getProgress);
router.post('/:customerId/measurements', addMeasurement);
router.get('/:customerId/attendance', getAttendance);

export default router;
