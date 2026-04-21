import Notification from '../models/Notification.js';

const getGymId = (req) => req.user.gymId?._id || req.user.gymId;

// @desc   Get notifications for current user
// @route  GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { userId: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total: await Notification.countDocuments(query),
        page: parseInt(page),
        pages: Math.ceil((await Notification.countDocuments(query)) / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Mark notification as read
// @route  PATCH /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true, readAt: new Date(), status: 'read' },
      { new: true }
    );

    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Mark all as read
// @route  PATCH /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date(), status: 'read' }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Delete a notification
// @route  DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc   Create notification (trainer/admin → customer)
// @route  POST /api/notifications
export const createNotification = async (req, res) => {
  try {
    const gymId = getGymId(req);
    const { userId, title, message, type, scheduledFor } = req.body;

    const notification = await Notification.create({
      userId,
      gymId,
      title,
      message,
      type: type || 'general',
      status: scheduledFor ? 'pending' : 'sent',
      scheduledFor,
    });

    // Emit in real-time if not scheduled
    if (!scheduledFor) {
      req.io?.to(userId.toString()).emit('new_notification', { title, message });
    }

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
