import User from '../models/User.js';
import Gym from '../models/Gym.js';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import generateToken from '../utils/generateToken.js';

const getGymId = (req) => req.user.gymId?._id || req.user.gymId;

// @desc   Get admin dashboard analytics
// @route  GET /api/admin/dashboard
export const getDashboard = async (req, res) => {
  try {
    const gymId = getGymId(req);

    const [trainers, customers, gym, activeCustomers] = await Promise.all([
      User.countDocuments({ gymId, role: 'trainer' }),
      User.countDocuments({ gymId, role: 'customer' }),
      Gym.findById(gymId).populate('ownerId', 'name email'),
      User.countDocuments({ gymId, role: 'customer', isActive: true }),
    ]);

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newCustomers = await User.countDocuments({
      gymId,
      role: 'customer',
      createdAt: { $gte: thirtyDaysAgo },
    });

    const newTrainers = await User.countDocuments({
      gymId,
      role: 'trainer',
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Monthly growth data (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const count = await User.countDocuments({
        gymId,
        role: 'customer',
        createdAt: { $gte: start, $lt: end },
      });

      monthlyData.push({
        month: start.toLocaleString('default', { month: 'short' }),
        customers: count,
      });
    }

    res.json({
      success: true,
      data: {
        stats: {
          trainers,
          customers,
          activeCustomers,
          newCustomers,
          newTrainers,
          gymPlan: gym?.subscriptionPlan || 'basic',
        },
        monthlyGrowth: monthlyData,
        gym,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get all trainers
// @route  GET /api/admin/trainers
export const getTrainers = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { page = 1, limit = 20, search = '' } = req.query;

    const query = { gymId, role: 'trainer' };
    if (search) query.name = { $regex: search, $options: 'i' };

    const trainers = await User.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Attach customer count to each trainer
    const trainersWithCounts = await Promise.all(
      trainers.map(async (trainer) => {
        const customerCount = await User.countDocuments({ trainerId: trainer._id });
        return { ...trainer.toObject(), customerCount };
      })
    );

    res.json({
      success: true,
      data: trainersWithCounts,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Create a trainer
// @route  POST /api/admin/trainers
export const createTrainer = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { name, email, password, phone } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const trainer = await User.create({
      name,
      email,
      password,
      phone,
      role: 'trainer',
      gymId,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Trainer created', data: trainer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Update a trainer
// @route  PUT /api/admin/trainers/:id
export const updateTrainer = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const trainer = await User.findOneAndUpdate(
      { _id: req.params.id, gymId, role: 'trainer' },
      req.body,
      { new: true, runValidators: true }
    );

    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });

    res.json({ success: true, message: 'Trainer updated', data: trainer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Delete a trainer
// @route  DELETE /api/admin/trainers/:id
export const deleteTrainer = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const trainer = await User.findOneAndDelete({ _id: req.params.id, gymId, role: 'trainer' });

    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });

    // Unassign their customers
    await User.updateMany({ trainerId: req.params.id }, { $unset: { trainerId: 1 } });

    res.json({ success: true, message: 'Trainer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get all customers in gym
// @route  GET /api/admin/customers
export const getAllCustomers = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { page = 1, limit = 20, search = '', trainerId } = req.query;

    const query = { gymId, role: 'customer' };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (trainerId) query.trainerId = trainerId;

    const customers = await User.find(query)
      .populate('trainerId', 'name email')
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

// @desc   Toggle user active status
// @route  PATCH /api/admin/users/:id/toggle
export const toggleUserStatus = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const user = await User.findOne({ _id: req.params.id, gymId });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      data: { isActive: user.isActive },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Assign trainer to customer
// @route  PATCH /api/admin/customers/:customerId/assign
export const assignTrainer = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { trainerId } = req.body;

    const customer = await User.findOneAndUpdate(
      { _id: req.params.customerId, gymId, role: 'customer' },
      { trainerId },
      { new: true }
    ).populate('trainerId', 'name email');

    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    res.json({ success: true, message: 'Trainer assigned', data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Broadcast notification to all users
// @route  POST /api/admin/broadcast
export const broadcastNotification = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { title, message, targetRole } = req.body;

    const query = { gymId };
    if (targetRole && targetRole !== 'all') query.role = targetRole;

    const users = await User.find(query).select('_id');

    const notifications = users.map((u) => ({
      userId: u._id,
      gymId,
      title,
      message,
      type: 'broadcast',
      status: 'sent',
    }));

    await Notification.insertMany(notifications);

    // Emit via Socket.io
    users.forEach((u) => {
      req.io?.to(u._id.toString()).emit('new_notification', { title, message });
    });

    res.json({ success: true, message: `Notification sent to ${users.length} users` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get subscription info
// @route  GET /api/admin/subscription
export const getSubscription = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const subscription = await Subscription.findOne({ gymId }).sort({ createdAt: -1 });
    const gym = await Gym.findById(gymId);

    res.json({ success: true, data: { subscription, gym } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Update subscription plan
// @route  PUT /api/admin/subscription
export const updateSubscription = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { plan } = req.body;

    const planFeatures = { basic: { maxTrainers: 3, maxCustomers: 45 }, pro: { maxTrainers: 10, maxCustomers: 500 }, premium: { maxTrainers: 999, maxCustomers: 9999 } };
    const features = planFeatures[plan] || planFeatures.basic;

    const subscription = await Subscription.findOneAndUpdate(
      { gymId },
      { plan, status: 'active', features },
      { new: true, upsert: true }
    );

    await Gym.findByIdAndUpdate(gymId, { subscriptionPlan: plan });

    res.json({ success: true, message: 'Subscription updated', data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
