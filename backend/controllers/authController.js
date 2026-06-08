const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Register a new staff user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { fullName, username, email, phone, password, role } = req.body;

    // --- Validation ---
    const errors = [];

    if (!fullName || !fullName.trim()) {
      errors.push('Full name is required');
    } else if (!/^[A-Za-z\s]+$/.test(fullName.trim())) {
      errors.push('Full name must contain only letters and spaces');
    }

    if (!username || !username.trim()) {
      errors.push('Username is required');
    } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      errors.push('Username must be 3-30 characters (letters, numbers, underscores only)');
    }

    if (!email || !email.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Please provide a valid email address');
    }

    if (!phone || !phone.trim()) {
      errors.push('Phone number is required');
    } else if (!/^[+]?[\d\s-]{9,15}$/.test(phone.trim())) {
      errors.push('Phone number must be 9-15 digits');
    }

    if (!password) {
      errors.push('Password is required');
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (role && !['ADMIN', 'MANAGER', 'CASHIER'].includes(role)) {
      errors.push('Role must be ADMIN, MANAGER, or CASHIER');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }]
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`
      });
    }

    // Create user
    const user = await User.create({
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role: role || 'CASHIER'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact an administrator.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
