import mongoose from 'mongoose';

const measurementSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  weight: { type: Number }, // kg
  height: { type: Number }, // cm
  bmi: { type: Number },
  bodyFat: { type: Number }, // percentage
  muscleMass: { type: Number }, // kg
  chest: { type: Number }, // cm
  waist: { type: Number }, // cm
  hips: { type: Number }, // cm
  arms: { type: Number }, // cm
  thighs: { type: Number }, // cm
  notes: { type: String },
  images: [
    {
      url: { type: String },
      type: { type: String, enum: ['front', 'side', 'back'] },
    },
  ],
});

const progressSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    measurements: [measurementSchema],
    goalWeight: { type: Number },
    startWeight: { type: Number },
    currentWeight: { type: Number },
    attendanceLog: [
      {
        date: { type: Date, default: Date.now },
        present: { type: Boolean, default: true },
        notes: { type: String },
      },
    ],
    weeklyStats: [
      {
        weekStart: { type: Date },
        dietCompletionRate: { type: Number, default: 0 }, // percentage
        workoutCompletionRate: { type: Number, default: 0 },
        avgCaloriesConsumed: { type: Number, default: 0 },
        workoutsCompleted: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

// Auto-calculate BMI
measurementSchema.pre('save', function (next) {
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    this.bmi = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(2));
  }
  next();
});

export default mongoose.model('Progress', progressSchema);
