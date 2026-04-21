import Progress from '../models/Progress.js';

const getGymId = (req) => req.user.gymId?._id || req.user.gymId;

const autoCalcBMI = (weight, height) => {
  if (!weight || !height) return null;
  const h = height / 100;
  return parseFloat((weight / (h * h)).toFixed(2));
};

// @desc   Get progress for a customer
// @route  GET /api/progress/:customerId
export const getProgress = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const customerId = req.user.role === 'customer' ? req.user._id : req.params.customerId;

    const progress = await Progress.findOne({ customerId, gymId })
      .populate('customerId', 'name email goal height weight')
      .populate('trainerId', 'name');

    if (!progress) return res.status(404).json({ success: false, message: 'Progress record not found' });

    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Add a measurement
// @route  POST /api/progress/:customerId/measurements
export const addMeasurement = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const customerId = req.user.role === 'customer' ? req.user._id : req.params.customerId;

    const { weight, height, bodyFat, muscleMass, chest, waist, hips, arms, thighs, notes, images } = req.body;

    const bmi = autoCalcBMI(weight, height);

    const progress = await Progress.findOneAndUpdate(
      { customerId, gymId },
      {
        $push: {
          measurements: {
            date: new Date(),
            weight,
            height,
            bmi,
            bodyFat,
            muscleMass,
            chest,
            waist,
            hips,
            arms,
            thighs,
            notes,
            images: images || [],
          },
        },
        $set: { currentWeight: weight },
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Measurement added', data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get attendance log
// @route  GET /api/progress/:customerId/attendance
export const getAttendance = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const customerId = req.user.role === 'customer' ? req.user._id : req.params.customerId;

    const progress = await Progress.findOne({ customerId, gymId }).select('attendanceLog');

    res.json({ success: true, data: progress?.attendanceLog || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get all customers progress for trainer
// @route  GET /api/progress
export const getAllProgress = async (req, res) => {
  try {
    const gymId = getGymId(req);

    const query = { gymId };
    if (req.user.role === 'trainer') query.trainerId = req.user._id;

    const progress = await Progress.find(query)
      .populate('customerId', 'name email goal')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
