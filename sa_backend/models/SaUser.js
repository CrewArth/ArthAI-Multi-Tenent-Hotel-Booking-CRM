import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const saUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['SUPER_SUPER_ADMIN'],
    default: 'SUPER_SUPER_ADMIN',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

saUserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default saUserSchema;
