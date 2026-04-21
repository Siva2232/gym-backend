import express from 'express';
import { createWorkout, getWorkouts, getWorkout, updateWorkout, deleteWorkout, completeWorkout } from '../controllers/workoutController.js';
import { protect } from '../middleware/auth.js';
import { authorize, gymIsolation } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(protect, gymIsolation);

// Customer: get own workout plan
router.get('/my', authorize('customer'), async (req, res) => {
  try {
    const { default: Workout } = await import('../models/Workout.js');
    const workout = await Workout.findOne({ customerId: req.user._id, gymId: req.user.gymId, isActive: true });
    res.json({ success: true, data: workout });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/', getWorkouts);
router.post('/', authorize('trainer', 'admin'), createWorkout);
router.get('/:id', getWorkout);
router.put('/:id', authorize('trainer', 'admin'), updateWorkout);
router.delete('/:id', authorize('trainer', 'admin'), deleteWorkout);
router.post('/:id/complete', authorize('customer'), completeWorkout);

export default router;
