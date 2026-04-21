import User from '../models/User.js';
import Gym from '../models/Gym.js';
import Subscription from '../models/Subscription.js';
import generateToken from '../utils/generateToken.js';
import { v4 as uuidv4 } from 'uuid';

// @desc   Register first admin + gym (onboarding)
// @route  POST /api/auth/register
// @access Public
export const register = async (req, res) => {
  try {
    const { name, email, password, gymName } = req.body;

    if (!name || !email || !password || !gymName) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create gym
    const gym = await Gym.create({ name: gymName, subscriptionPlan: 'trial' });

    // Create subscription
    await Subscription.create({ gymId: gym._id, plan: 'basic', status: 'trial' });

    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
      gymId: gym._id,
    });

    // Assign owner to gym
    gym.ownerId = user._id;
    await gym.save();

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gymId: user.gymId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Login user
// @route  POST /api/auth/login
// @access Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).populate('gymId', 'name subscriptionPlan isActive');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gymId: user.gymId,
        avatar: user.avatar,
        goal: user.goal,
        trainerId: user.trainerId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Get current user profile
// @route  GET /api/auth/me
// @access Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('gymId', 'name subscriptionPlan settings')
      .populate('trainerId', 'name email avatar');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Update profile
// @route  PUT /api/auth/profile
// @access Private
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, goal, height, weight, age, gender, avatar, fcmToken } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, goal, height, weight, age, gender, avatar, fcmToken },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Change password
// @route  PUT /api/auth/change-password
// @access Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Accept invite and set password
// @route  POST /api/auth/accept-invite
// @access Public
export const acceptInvite = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      inviteToken: token,
      inviteExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invite token' });
    }

    user.password = password;
    user.inviteToken = undefined;
    user.inviteExpires = undefined;
    user.isActive = true;
    await user.save();

    const authToken = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Account activated successfully',
      token: authToken,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, gymId: user.gymId },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
