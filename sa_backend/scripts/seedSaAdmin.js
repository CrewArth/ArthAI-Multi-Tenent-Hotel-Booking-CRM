import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { connectCentralDb } from '../config/db.js';
import saUserSchema from '../models/SaUser.js';

const seed = async () => {
  try {
    console.log('🚀 Seeding Super Super Admin account...');

    const masterConn = await connectCentralDb();
    const SaUser = masterConn.model('SaUser', saUserSchema);

    const email = 'arth@superadmin.in';
    const rawPassword = 'Arthvala@15';

    let admin = await SaUser.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      admin = await SaUser.create({
        name: 'Arth Super Admin',
        email: email.toLowerCase().trim(),
        password: rawPassword,
        role: 'SUPER_SUPER_ADMIN',
        isActive: true,
      });
      console.log(`✅ Super Super Admin created successfully!`);
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Password: ${rawPassword}`);
    } else {
      admin.password = rawPassword;
      admin.isActive = true;
      await admin.save();
      console.log(`✅ Super Super Admin account updated successfully!`);
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Password: ${rawPassword}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
