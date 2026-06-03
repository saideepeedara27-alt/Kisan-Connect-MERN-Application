import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import User from './models/User.js';

dotenv.config();

async function createAdmin() {
  await connectDb();

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Password123';
  const name = process.env.ADMIN_NAME || 'Kisan Connect Admin';

  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) {
    existingAdmin.name = name;
    existingAdmin.password = password;
    existingAdmin.role = 'admin';
    existingAdmin.phone = existingAdmin.phone || '9000000099';
    existingAdmin.village = existingAdmin.village || 'Operations';
    await existingAdmin.save();
    console.log(`Admin updated: ${email}`);
  } else {
    await User.create({
      name,
      email,
      password,
      role: 'admin',
      phone: '9000000099',
      village: 'Operations'
    });
    console.log(`Admin created: ${email}`);
  }

  await mongoose.connection.close();
}

createAdmin().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
