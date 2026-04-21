import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['admin', 'trainer', 'customer'], required: true },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for customers
    phone: { type: String, trim: true },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    inviteToken: { type: String },
    inviteExpires: { type: Date },
    passwordChangedAt: { type: Date },
    goal: { type: String, enum: ['weight_loss', 'muscle_gain', 'maintenance', 'general_fitness'], default: 'general_fitness' },
    height: { type: Number }, // cm
    weight: { type: Number }, // kg
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    fcmToken: { type: String }, // Firebase Cloud Messaging
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },
    lastLogin: { type: Date },
    streak: {
      diet: { type: Number, default: 0 },
      workout: { type: Number, default: 0 },
      lastDietDate: { type: Date },
      lastWorkoutDate: { type: Date },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.inviteToken;
  delete obj.inviteExpires;
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);
