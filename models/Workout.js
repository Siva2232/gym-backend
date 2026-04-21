import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, default: 3 },
  reps: { type: String, default: '10-12' }, // e.g., "10-12" or "30 seconds"
  weight: { type: String }, // e.g., "20 kg" or "bodyweight"
  restTime: { type: Number, default: 60 }, // seconds
  videoUrl: { type: String },
  thumbnailUrl: { type: String },
  instructions: { type: String },
  muscleGroup: { type: String },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
  order: { type: Number, default: 0 },
});

const dayPlanSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  },
  focus: { type: String }, // e.g., "Chest & Triceps"
  exercises: [exerciseSchema],
  isRestDay: { type: Boolean, default: false },
  estimatedDuration: { type: Number }, // minutes
  notes: { type: String },
});

const workoutSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    description: { type: String },
    goal: { type: String },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
    weeklySchedule: [dayPlanSchema],
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    completionLog: [
      {
        date: { type: Date },
        day: { type: String },
        exercisesCompleted: { type: Number, default: 0 },
        totalExercises: { type: Number, default: 0 },
        duration: { type: Number }, // actual duration in minutes
        completed: { type: Boolean, default: false },
      },
    ],
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Workout', workoutSchema);
