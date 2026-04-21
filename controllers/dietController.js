import Diet from '../models/Diet.js';
import Notification from '../models/Notification.js';

const getGymId = (req) => req.user.gymId?._id || req.user.gymId;

// @desc   Create a diet plan
// @route  POST /api/diet
export const createDiet = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const trainerId = req.user._id;

    const payload = { ...req.body, trainerId, gymId };
    if (payload.title) {
      payload.name = payload.title;
      delete payload.title;
    }
    if (payload.description) {
      payload.notes = payload.description;
      delete payload.description;
    }
    if (payload.totalCalories) {
      payload.totalDailyCalories = payload.totalCalories;
      delete payload.totalCalories;
    }

    const diet = await Diet.create(payload);

    // Create meal reminders for the customer
    if (diet.meals && diet.meals.length > 0) {
      const notifications = diet.meals.map((meal) => ({
        userId: diet.customerId,
        gymId,
        title: `Time for ${meal.mealType}! 🍽️`,
        message: `Your ${meal.mealType} is scheduled at ${meal.time}. Stay on track with your plan!`,
        type: 'meal_reminder',
        scheduledFor: new Date(), // in production, parse meal.time properly
        status: 'pending',
        metadata: { mealType: meal.mealType, dietId: diet._id },
      }));

      await Notification.insertMany(notifications);
    }

    // Notify customer
    await Notification.create({
      userId: diet.customerId,
      gymId,
      title: 'New Diet Plan Assigned 🥗',
      message: `Your trainer has created a new diet plan: "${diet.name}"`,
      type: 'general',
      status: 'sent',
    });

    req.io?.to(diet.customerId.toString()).emit('new_notification', {
      title: 'New Diet Plan Assigned 🥗',
      message: `Your trainer has created a new diet plan: "${diet.name}"`,
    });

    res.status(201).json({ success: true, message: 'Diet plan created', data: diet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get all diet plans by trainer
// @route  GET /api/diet
export const getDietsByTrainer = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { customerId } = req.query;

    const query = { gymId };
    if (req.user.role === 'trainer') query.trainerId = req.user._id;
    if (req.user.role === 'customer') query.customerId = req.user._id;
    if (customerId) query.customerId = customerId;

    const diets = await Diet.find(query)
      .populate('customerId', 'name email')
      .populate('trainerId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: diets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get single diet plan
// @route  GET /api/diet/:id
export const getDiet = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const query = { _id: req.params.id, gymId };

    if (req.user.role === 'trainer') query.trainerId = req.user._id;
    if (req.user.role === 'customer') query.customerId = req.user._id;

    const diet = await Diet.findOne(query)
      .populate('customerId', 'name email goal')
      .populate('trainerId', 'name');

    if (!diet) return res.status(404).json({ success: false, message: 'Diet plan not found' });

    res.json({ success: true, data: diet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Update diet plan
// @route  PUT /api/diet/:id
export const updateDiet = async (req, res) => {
  try {
    const gymId = getGymId(req);

    const payload = { ...req.body };
    if (payload.title) {
      payload.name = payload.title;
      delete payload.title;
    }
    if (payload.description) {
      payload.notes = payload.description;
      delete payload.description;
    }
    if (payload.totalCalories) {
      payload.totalDailyCalories = payload.totalCalories;
      delete payload.totalCalories;
    }

    const diet = await Diet.findOneAndUpdate(
      { _id: req.params.id, trainerId: req.user._id, gymId },
      payload,
      { new: true, runValidators: true }
    );

    if (!diet) return res.status(404).json({ success: false, message: 'Diet plan not found' });

    res.json({ success: true, message: 'Diet plan updated', data: diet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Delete diet plan
// @route  DELETE /api/diet/:id
export const deleteDiet = async (req, res) => {
  try {
    const gymId = getGymId(req);

    const diet = await Diet.findOneAndDelete({ _id: req.params.id, trainerId: req.user._id, gymId });
    if (!diet) return res.status(404).json({ success: false, message: 'Diet plan not found' });

    res.json({ success: true, message: 'Diet plan deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Mark meal as completed (customer)
// @route  POST /api/diet/:id/complete-meal
export const completeMeal = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { mealType, date } = req.body;

    const diet = await Diet.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user._id, gymId },
      {
        $push: {
          completionLog: {
            date: date || new Date(),
            mealType,
            completed: true,
            completedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!diet) return res.status(404).json({ success: false, message: 'Diet not found' });

    res.json({ success: true, message: 'Meal marked as completed', data: diet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
