const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, adminInvite } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedRole = String(role || 'user').trim().toLowerCase();
    const normalizedPhone = phone ? String(phone).trim() : null;
    const invite = String(adminInvite || '').trim();
    const inviteSecret = process.env.ADMIN_INVITE_SECRET || '';
    const finalRole = normalizedRole === 'admin' && invite && inviteSecret && invite === inviteSecret ? 'admin' : 'user';

    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    // Pass plain password; the model hashes once during insert
    user = new User({ name, email: normalizedEmail, password, role: finalRole, phone: normalizedPhone });
    await user.save();

    // Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    // Reload to include default flags (beta/tester)
    const createdUser = await User.findById(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: createdUser.id, name: createdUser.name, email: createdUser.email, role: createdUser.role, phone: createdUser.phone || null, beta: createdUser.beta, tester: createdUser.tester, subdeviceIds: createdUser.subdeviceIds || [] }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Check for user
    const user = await User.findOneWithPassword(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone || null, beta: user.beta, tester: user.tester, subdeviceIds: user.subdeviceIds || [] }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar || null, role: user.role, phone: user.phone || null, beta: user.beta, tester: user.tester, subdeviceIds: user.subdeviceIds || [] }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate);

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    // Load user with password for verification
    const user = await User.findByIdWithPassword(req.user.id);

    // Check current password
    if (!(await bcrypt.compare(req.body.currentPassword, user.password))) {
      return res.status(401).json({ message: 'Password is incorrect' });
    }

    // Hash and update new password using SQL-backed model
    const hashed = await bcrypt.hash(req.body.newPassword, parseInt(process.env.SALT_ROUNDS || '10', 10));
    await User.findByIdAndUpdate(req.user.id, { password: hashed });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      success: true,
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
