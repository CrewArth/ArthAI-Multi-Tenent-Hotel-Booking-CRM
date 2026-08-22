import bcrypt from 'bcryptjs';
import { connectCentralDb } from '../config/db.js';
import saUserSchema from '../models/SaUser.js';
import { generateSaToken } from '../utils/jwt.js';

const getSaUserModel = async () => {
  const master = await connectCentralDb();
  return master.model('SaUser', saUserSchema);
};

export const saLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const SaUser = await getSaUserModel();
    const user = await SaUser.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateSaToken(user);
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Super Super Admin login error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
