import mongoose from 'mongoose';

const gymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    logo: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subscriptionPlan: {
      type: String,
      enum: ['basic', 'pro', 'premium'],
      default: 'basic',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'trial'],
      default: 'trial',
    },
    maxTrainers: { type: Number, default: 5 },
    maxCustomers: { type: Number, default: 50 },
    isActive: { type: Boolean, default: true },
    settings: {
      currency: { type: String, default: 'USD' },
      timezone: { type: String, default: 'UTC' },
      workingHours: { type: String, default: '6:00 AM - 10:00 PM' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Gym', gymSchema);
