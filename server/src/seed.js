import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import DeliveryPartner from './models/DeliveryPartner.js';
import Order from './models/Order.js';
import Product from './models/Product.js';
import Subscription from './models/Subscription.js';
import SupportTicket from './models/SupportTicket.js';
import User from './models/User.js';

dotenv.config();

async function seed() {
  await connectDb();
  await Promise.all([
    User.deleteMany({}),
    DeliveryPartner.deleteMany({}),
    Order.deleteMany({}),
    Product.deleteMany({}),
    Subscription.deleteMany({}),
    SupportTicket.deleteMany({})
  ]);

  const farmerOne = await User.create({
    name: 'Anand Fresh Fields',
    email: 'farmer@example.com',
    password: 'Password123',
    role: 'farmer',
    phone: '9000000001',
    village: 'Nashik',
    farmerProfile: {
      farmName: 'Anand Fresh Fields',
      farmAddress: 'Near Pimpalgaon market road, Nashik',
      farmSize: '6 acres',
      experienceYears: 12,
      verificationIdType: 'farm_certificate',
      verificationIdNumber: 'KM-SEED-ANAND-001',
      verificationStatus: 'approved',
      verificationSubmittedAt: new Date(),
      verificationReviewedAt: new Date(),
      ratingAverage: 4.7,
      ratingCount: 18
    }
  });

  const farmerTwo = await User.create({
    name: 'Savita Natural Dairy',
    email: 'farmer2@example.com',
    password: 'Password123',
    role: 'farmer',
    phone: '9000000003',
    village: 'Satara',
    farmerProfile: {
      farmName: 'Savita Natural Dairy',
      farmAddress: 'Koregaon dairy lane, Satara',
      farmSize: '4 acres',
      experienceYears: 9,
      verificationIdType: 'farm_certificate',
      verificationIdNumber: 'KM-SEED-SAVITA-002',
      verificationStatus: 'approved',
      verificationSubmittedAt: new Date(),
      verificationReviewedAt: new Date(),
      ratingAverage: 4.8,
      ratingCount: 24
    }
  });

  await User.create({
    name: 'Meera Customer',
    email: 'customer@example.com',
    password: 'Password123',
    role: 'customer',
    phone: '9000000002',
    village: 'Pune'
  });

  await User.create({
    name: 'Kisan Connect Admin',
    email: 'admin@example.com',
    password: 'Password123',
    role: 'admin',
    phone: '9000000099',
    village: 'Operations'
  });

  const deliveryUser = await User.create({
    name: 'Ravi Kisan Delivery',
    email: 'delivery@example.com',
    password: 'Password123',
    role: 'delivery',
    phone: '9000000045',
    village: 'Pune'
  });

  await DeliveryPartner.create({
    user: deliveryUser._id,
    serviceAreas: ['Pune', 'Nashik', 'Satara', 'Ratnagiri'],
    vehicleType: 'EV bike',
    vehicleNumber: 'MH 12 KR 2045',
    licenseNumber: 'DL-KC-SEED-045',
    status: 'approved',
    isAvailable: true
  });

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await Subscription.create([
    {
      farmer: farmerOne._id,
      status: 'active',
      amount: Number(process.env.FARMER_SUBSCRIPTION_AMOUNT || 199),
      currency: process.env.CURRENCY || 'INR',
      paymentReference: 'seed-subscription-1',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth
    },
    {
      farmer: farmerTwo._id,
      status: 'active',
      amount: Number(process.env.FARMER_SUBSCRIPTION_AMOUNT || 199),
      currency: process.env.CURRENCY || 'INR',
      paymentReference: 'seed-subscription-2',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth
    }
  ]);

  await Product.create([
    {
      farmer: farmerOne._id,
      name: 'Fresh Tomatoes',
      category: 'Vegetables',
      description: 'Firm, ripe tomatoes harvested this week and packed directly at the farm.',
      price: 38,
      unit: 'kg',
      stock: 120,
      location: 'Nashik'
    },
    {
      farmer: farmerOne._id,
      name: 'Organic Carrots',
      category: 'Vegetables',
      description: 'Naturally grown carrots with clean texture and mild sweetness.',
      price: 46,
      unit: 'kg',
      stock: 80,
      location: 'Nashik'
    },
    {
      farmer: farmerOne._id,
      name: 'Green Spinach Bundle',
      category: 'Leafy Greens',
      description: 'Fresh spinach bundles washed, sorted, and ready for local delivery.',
      price: 25,
      unit: 'bundle',
      stock: 60,
      location: 'Nashik'
    },
    {
      farmer: farmerOne._id,
      name: 'Alphonso Mango Crate',
      category: 'Fruits',
      description: 'Seasonal mangoes sorted by size and packed carefully for city delivery.',
      price: 680,
      unit: 'crate',
      stock: 24,
      location: 'Ratnagiri'
    },
    {
      farmer: farmerOne._id,
      name: 'Whole Wheat Grain',
      category: 'Grains',
      description: 'Cleaned wheat grain from the latest harvest, suitable for flour mills and homes.',
      price: 34,
      unit: 'kg',
      stock: 450,
      location: 'Ahmednagar'
    },
    {
      farmer: farmerTwo._id,
      name: 'Fresh Cow Milk',
      category: 'Dairy',
      description: 'Morning milk collected, chilled, and prepared for same-day local delivery.',
      price: 62,
      unit: 'litre',
      stock: 90,
      location: 'Satara'
    },
    {
      farmer: farmerTwo._id,
      name: 'Turmeric Fingers',
      category: 'Spices',
      description: 'Sun-dried turmeric fingers with deep color and strong natural aroma.',
      price: 145,
      unit: 'kg',
      stock: 70,
      location: 'Sangli'
    },
    {
      farmer: farmerTwo._id,
      name: 'Toor Dal',
      category: 'Pulses',
      description: 'Stone-cleaned toor dal from local farms, packed in small buyer-friendly lots.',
      price: 118,
      unit: 'kg',
      stock: 160,
      location: 'Latur'
    }
  ]);

  console.log('Seed complete.');
  await mongoose.connection.close();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
