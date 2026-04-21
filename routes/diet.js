import express from 'express';
import { createDiet, getDietsByTrainer, getDiet, updateDiet, deleteDiet, completeMeal } from '../controllers/dietController.js';
import { protect } from '../middleware/auth.js';
import { authorize, gymIsolation } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(protect, gymIsolation);

// Customer: get own diet plan
router.get('/my', authorize('customer'), async (req, res) => {
  try {
    const { default: Diet } = await import('../models/Diet.js');
    const diet = await Diet.findOne({ customerId: req.user._id, gymId: req.user.gymId, isActive: true });
    res.json({ success: true, data: diet });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/', getDietsByTrainer);
router.post('/', authorize('trainer', 'admin'), createDiet);
router.get('/:id', getDiet);
router.put('/:id', authorize('trainer', 'admin'), updateDiet);
router.delete('/:id', authorize('trainer', 'admin'), deleteDiet);
router.post('/:id/complete-meal', authorize('customer'), completeMeal);

export default router;
