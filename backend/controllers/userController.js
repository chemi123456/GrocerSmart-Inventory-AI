const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};

    if (role) filter.role = role.toUpperCase();
    if (status) filter.status = status.toUpperCase();
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile/role
// @route   PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const { fullName, phone, role, status } = req.body;
    const errors = [];

    // Validation for optional fields if provided
    if (fullName !== undefined) {
      if (!fullName.trim()) {
        errors.push('Full name cannot be empty');
      } else if (!/^[A-Za-z\s]+$/.test(fullName.trim())) {
        errors.push('Full name must contain only letters and spaces');
      }
    }

    if (phone !== undefined) {
      if (!phone.trim()) {
        errors.push('Phone number cannot be empty');
      } else if (!/^[+]?[\d\s-]{9,15}$/.test(phone.trim())) {
        errors.push('Phone number must be 9-15 digits');
      }
    }

    if (role && !['ADMIN', 'MANAGER', 'CASHIER'].includes(role)) {
      errors.push('Role must be ADMIN, MANAGER, or CASHIER');
    }

    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      errors.push('Status must be ACTIVE or INACTIVE');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (phone) updateData.phone = phone.trim();
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (deactivate) a user
// @route   DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    // Soft delete — set status to INACTIVE
    user.status = 'INACTIVE';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};
