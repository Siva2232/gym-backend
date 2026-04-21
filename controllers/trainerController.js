import User from '../models/User.js';
import Diet from '../models/Diet.js';
import Workout from '../models/Workout.js';
import Progress from '../models/Progress.js';
import Notification from '../models/Notification.js';
import { sendInviteEmail } from '../utils/email.js';
import { v4 as uuidv4 } from 'uuid';

const getGymId = (req) => req.user.gymId?._id || req.user.gymId;

// @desc   Get trainer dashboard stats
// @route  GET /api/trainer/dashboard
export const getTrainerDashboard = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const trainerId = req.user._id;

    const [customers, activeCustomers] = await Promise.all([
      User.countDocuments({ trainerId, gymId }),
      User.countDocuments({ trainerId, gymId, isActive: true }),
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newCustomers = await User.countDocuments({
      trainerId,
      gymId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Monthly customer growth
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const count = await User.countDocuments({
        trainerId,
        gymId,
        createdAt: { $gte: start, $lt: end },
      });

      monthlyData.push({
        month: start.toLocaleString('default', { month: 'short' }),
        customers: count,
      });
    }

    // Recent customers
    const recentCustomers = await User.find({ trainerId, gymId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email goal isActive createdAt');

    res.json({
      success: true,
      data: {
        stats: { customers, activeCustomers, newCustomers },
        monthlyGrowth: monthlyData,
        recentCustomers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get trainer's customers
// @route  GET /api/trainer/customers
export const getMyCustomers = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { page = 1, limit = 20, search = '' } = req.query;

    const query = { trainerId: req.user._id, gymId, role: 'customer' };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const customers = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: customers,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Create a customer (with invite)
// @route  POST /api/trainer/customers
export const createCustomer = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { name, email, goal, phone, height, weight, age, gender, sendInvite = true } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const inviteToken = uuidv4();
    const inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    const customer = await User.create({
      name,
      email,
      password: inviteToken, // temp password — will be changed on invite accept
      role: 'customer',
      gymId,
      trainerId: req.user._id,
      createdBy: req.user._id,
      goal: goal || 'general_fitness',
      phone,
      height,
      weight,
      age,
      gender,
      inviteToken,
      inviteExpires,
      isActive: !sendInvite, // active immediately if no invite
    });

    // Create progress tracker
    await Progress.create({
      customerId: customer._id,
      trainerId: req.user._id,
      gymId,
      startWeight: weight,
      currentWeight: weight,
    });

    // Send invite email
    if (sendInvite) {
      const gym = await (await import('../models/Gym.js')).default.findById(gymId);
      try {
        await sendInviteEmail({
          to: email,
          name,
          trainerName: req.user.name,
          gymName: gym?.name || 'GymSaaS',
          inviteToken,
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError.message);
      }
    }

    // Create welcome notification
    await Notification.create({
      userId: customer._id,
      gymId,
      title: 'Welcome to the team! 💪',
      message: `Your trainer ${req.user.name} has created your account. Start your fitness journey today!`,
      type: 'general',
      status: 'sent',
    });

    res.status(201).json({
      success: true,
      message: sendInvite ? 'Customer created and invite sent' : 'Customer created',
      data: customer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Update a customer
// @route  PUT /api/trainer/customers/:id
export const updateCustomer = async (req, res) => {
  try {
    const gymId = getGymId(req);

    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, trainerId: req.user._id, gymId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found or access denied' });
    }

    res.json({ success: true, message: 'Customer updated', data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get single customer detail
// @route  GET /api/trainer/customers/:id
export const getCustomerDetail = async (req, res) => {
  try {
    const gymId = getGymId(req);

    const customer = await User.findOne({ _id: req.params.id, trainerId: req.user._id, gymId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const [diet, workout, progress] = await Promise.all([
      Diet.findOne({ customerId: customer._id, isActive: true }),
      Workout.findOne({ customerId: customer._id, isActive: true }),
      Progress.findOne({ customerId: customer._id }),
    ]);

    res.json({
      success: true,
      data: { customer, diet, workout, progress },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Track customer attendance
// @route  POST /api/trainer/customers/:id/attendance
export const markAttendance = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { present = true, notes, date } = req.body;

    const customer = await User.findOne({ _id: req.params.id, trainerId: req.user._id, gymId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const progress = await Progress.findOneAndUpdate(
      { customerId: req.params.id },
      {
        $push: {
          attendanceLog: { date: date || new Date(), present, notes },
        },
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Attendance recorded', data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
