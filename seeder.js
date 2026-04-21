import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Gym from './models/Gym.js';

dotenv.config();

const seedDemoCredentials = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gym-saas';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    const defaultGym = await Gym.findOneAndUpdate(
      { name: 'Platinum Fitness' },
      {
        name: 'Platinum Fitness',
        address: '123 Muscle St, Fit City',
        phone: '123-456-7890',
        email: 'contact@platinumfitness.com',
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active',
        maxTrainers: 100,
        maxCustomers: 1000,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Default Gym ready:', defaultGym.name, defaultGym._id);

    const demoEmails = ['admin@gym.com', 'trainer@gym.com', 'customer@gym.com'];
    await User.deleteMany({ email: { $in: demoEmails } });

    const adminUser = await new User({
      name: 'System Admin',
      email: 'admin@gym.com',
      password: 'admin123',
      role: 'admin',
      gymId: defaultGym._id,
      isApproved: true,
    }).save();

    const trainerUser = await new User({
      name: 'Senior Trainer',
      email: 'trainer@gym.com',
      password: 'trainer123',
      role: 'trainer',
      gymId: defaultGym._id,
      createdBy: adminUser._id,
      isApproved: true,
    }).save();

    const customerUser = await new User({
      name: 'Demo Customer',
      email: 'customer@gym.com',
      password: 'customer123',
      role: 'customer',
      gymId: defaultGym._id,
      trainerId: trainerUser._id,
      createdBy: adminUser._id,
      isApproved: true,
    }).save();

    console.log('Seeded demo credentials successfully:');
    console.log('Admin   -> admin@gym.com / admin123');
    console.log('Trainer -> trainer@gym.com / trainer123');
    console.log('Customer-> customer@gym.com / customer123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo credentials:', error);
    process.exit(1);
  }
};

seedDemoCredentials();
