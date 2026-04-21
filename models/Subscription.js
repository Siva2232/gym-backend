import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    plan: { type: String, enum: ['basic', 'pro', 'premium'], required: true },
    status: { type: String, enum: ['active', 'inactive', 'expired', 'trial'], default: 'trial' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    price: { type: Number },
    currency: { type: String, default: 'USD' },
    features: {
      maxTrainers: { type: Number, default: 5 },
      maxCustomersPerTrainer: { type: Number, default: 20 },
      aiRecommendations: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      videoUploads: { type: Boolean, default: true },
      chatSupport: { type: Boolean, default: false },
    },
    paymentHistory: [
      {
        amount: { type: Number },
        currency: { type: String },
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['success', 'failed', 'pending'] },
        transactionId: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const PLAN_FEATURES = {
  basic: {
    maxTrainers: 3,
    maxCustomersPerTrainer: 15,
    aiRecommendations: false,
    customBranding: false,
    advancedAnalytics: false,
    videoUploads: false,
    chatSupport: false,
    price: 29,
  },
  pro: {
    maxTrainers: 10,
    maxCustomersPerTrainer: 50,
    aiRecommendations: false,
    customBranding: true,
    advancedAnalytics: true,
    videoUploads: true,
    chatSupport: true,
    price: 79,
  },
  premium: {
    maxTrainers: -1, // unlimited
    maxCustomersPerTrainer: -1, // unlimited
    aiRecommendations: true,
    customBranding: true,
    advancedAnalytics: true,
    videoUploads: true,
    chatSupport: true,
    price: 199,
  },
};

subscriptionSchema.statics.getPlanFeatures = (plan) => PLAN_FEATURES[plan] || PLAN_FEATURES.basic;

export default mongoose.model('Subscription', subscriptionSchema);
