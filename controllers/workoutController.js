import Workout from '../models/Workout.js';
import Notification from '../models/Notification.js';

const getGymId = (req) => req.user.gymId?._id || req.user.gymId;

// @desc   Create workout plan
// @route  POST /api/workout
export const createWorkout = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const trainerId = req.user._id;

    const workout = await Workout.create({ ...req.body, trainerId, gymId });

    // Notify customer
    await Notification.create({
      userId: workout.customerId,
      gymId,
      title: 'New Workout Plan Assigned 💪',
      message: `Your trainer has created a new workout plan: "${workout.name}"`,
      type: 'workout_reminder',
      status: 'sent',
      metadata: { workoutId: workout._id },
    });

    req.io?.to(workout.customerId.toString()).emit('new_notification', {
      title: 'New Workout Plan 💪',
      message: `Check out your new workout plan: "${workout.name}"`,
    });

    res.status(201).json({ success: true, message: 'Workout plan created', data: workout });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get workouts
// @route  GET /api/workout
export const getWorkouts = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { customerId } = req.query;

    const query = { gymId };
    if (req.user.role === 'trainer') query.trainerId = req.user._id;
    if (req.user.role === 'customer') query.customerId = req.user._id;
    if (customerId) query.customerId = customerId;

    const workouts = await Workout.find(query)
      .populate('customerId', 'name email')
      .populate('trainerId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: workouts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get single workout
// @route  GET /api/workout/:id
export const getWorkout = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const query = { _id: req.params.id, gymId };

    if (req.user.role === 'trainer') query.trainerId = req.user._id;
    if (req.user.role === 'customer') query.customerId = req.user._id;

    const workout = await Workout.findOne(query)
      .populate('customerId', 'name email goal')
      .populate('trainerId', 'name');

    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found' });

    res.json({ success: true, data: workout });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Update workout plan
// @route  PUT /api/workout/:id
export const updateWorkout = async (req, res) => {
  try {
    const gymId = getGymId(req);

    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, trainerId: req.user._id, gymId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found' });

    res.json({ success: true, message: 'Workout updated', data: workout });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Delete workout plan
// @route  DELETE /api/workout/:id
export const deleteWorkout = async (req, res) => {
  try {
    const gymId = getGymId(req);

    const workout = await Workout.findOneAndDelete({ _id: req.params.id, trainerId: req.user._id, gymId });
    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found' });

    res.json({ success: true, message: 'Workout deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Log workout completion (customer)
// @route  POST /api/workout/:id/complete
export const completeWorkout = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { day, exercisesCompleted, totalExercises, duration } = req.body;

    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user._id, gymId },
      {
        $push: {
          completionLog: {
            date: new Date(),
            day,
            exercisesCompleted,
            totalExercises,
            duration,
            completed: exercisesCompleted >= totalExercises,
          },
        },
      },
      { new: true }
    );

    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found' });

    res.json({ success: true, message: 'Workout logged', data: workout });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
