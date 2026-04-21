import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import User from '../models/User.js';
import Diet from '../models/Diet.js';
import Workout from '../models/Workout.js';
import Progress from '../models/Progress.js';

const router = express.Router();

router.use(protect, authorize('customer'));

// @desc  Get customer's own dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [diet, workout, progress] = await Promise.all([
      Diet.findOne({ customerId: req.user._id, isActive: true }).select('name meals totalDailyCalories'),
      Workout.findOne({ customerId: req.user._id, isActive: true }).select('name weeklySchedule'),
      Progress.findOne({ customerId: req.user._id }),
    ]);

    const user = await User.findById(req.user._id).populate('trainerId', 'name email avatar');

    res.json({
      success: true,
      data: { user, diet, workout, progress },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

