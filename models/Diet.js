import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema({
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'],
    required: true,
  },
  time: { type: String, required: true }, // e.g., "08:00 AM"
  foods: [
    {
      name: { type: String, required: true },
      quantity: { type: String }, // e.g., "200g", "1 cup"
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
  ],
  totalCalories: { type: Number, default: 0 },
  notes: { type: String },
});

const dietSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    meals: [mealSchema],
    totalDailyCalories: { type: Number, default: 0 },
    goal: { type: String },
    weeklyPlan: {
      monday: [mealSchema],
      tuesday: [mealSchema],
      wednesday: [mealSchema],
      thursday: [mealSchema],
      friday: [mealSchema],
      saturday: [mealSchema],
      sunday: [mealSchema],
    },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    notes: { type: String },
    completionLog: [
      {
        date: { type: Date },
        mealType: { type: String },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

// Auto-calculate total calories
dietSchema.pre('save', function (next) {
  this.totalDailyCalories = this.meals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0);
  next();
});

export default mongoose.model('Diet', dietSchema);
