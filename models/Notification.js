import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['meal_reminder', 'workout_reminder', 'progress_update', 'general', 'invite', 'broadcast'],
      default: 'general',
    },
    status: { type: String, enum: ['pending', 'sent', 'read', 'dismissed'], default: 'pending' },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    readAt: { type: Date },
    isRead: { type: Boolean, default: false },
    metadata: {
      mealType: { type: String },
      dietId: { type: mongoose.Schema.Types.ObjectId, ref: 'Diet' },
      workoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workout' },
      link: { type: String },
    },
    channels: {
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });

export default mongoose.model('Notification', notificationSchema);
