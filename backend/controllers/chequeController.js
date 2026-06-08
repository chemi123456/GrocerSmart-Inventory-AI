const Cheque = require('../models/Cheque');
const CreditCustomer = require('../models/CreditCustomer');

// @desc    Create a new cheque (PDC entry)
// @route   POST /api/cheques
exports.createCheque = async (req, res, next) => {
  try {
    const { chequeNumber, amount, bankName, issuedDate, dueDate, customer, type, notes } = req.body;
    const errors = [];

    if (!chequeNumber) {
      errors.push('Cheque number is required');
    } else if (!/^\d{6}$/.test(chequeNumber)) {
      errors.push('Cheque number must be exactly 6 digits');
    }

    if (!amount || Number(amount) <= 0) {
      errors.push('Cheque amount must be greater than 0');
    }

    if (!bankName || !bankName.trim()) errors.push('Bank name is required');
    if (!issuedDate) errors.push('Issued date is required');
    if (!dueDate) errors.push('Due date is required');
    if (!customer) errors.push('Customer reference is required');

    if (type && !['INCOMING', 'OUTGOING'].includes(type)) {
      errors.push('Type must be INCOMING or OUTGOING');
    }

    if (issuedDate && dueDate && new Date(dueDate) < new Date(issuedDate)) {
      errors.push('Due date must be on or after issued date');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Validate customer exists
    const customerDoc = await CreditCustomer.findById(customer);
    if (!customerDoc) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check for duplicate cheque number
    const existing = await Cheque.findOne({ chequeNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A cheque with this number already exists'
      });
    }

    const cheque = await Cheque.create({
      chequeNumber,
      amount: Number(amount),
      bankName: bankName.trim(),
      issuedDate: new Date(issuedDate),
      dueDate: new Date(dueDate),
      customer,
      type: type || 'INCOMING',
      notes: notes || ''
    });

    await cheque.populate('customer', 'name phone');

    res.status(201).json({
      success: true,
      message: 'Cheque recorded successfully',
      data: cheque
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all cheques
// @route   GET /api/cheques
exports.getAllCheques = async (req, res, next) => {
  try {
    const { status, type, search } = req.query;
    const filter = {};

    if (status) filter.status = status.toUpperCase();
    if (type) filter.type = type.toUpperCase();
    if (search) {
      filter.$or = [
        { chequeNumber: { $regex: search, $options: 'i' } },
        { bankName: { $regex: search, $options: 'i' } }
      ];
    }

    const cheques = await Cheque.find(filter)
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cheques.length,
      data: cheques
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single cheque
// @route   GET /api/cheques/:id
exports.getCheque = async (req, res, next) => {
  try {
    const cheque = await Cheque.findById(req.params.id)
      .populate('customer', 'name phone email');

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    res.status(200).json({
      success: true,
      data: cheque
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cheque status
// @route   PUT /api/cheques/:id/status
exports.updateChequeStatus = async (req, res, next) => {
  try {
    const { status, depositDate, clearedDate } = req.body;
    const errors = [];

    const validStatuses = ['PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED'];
    if (!status || !validStatuses.includes(status)) {
      errors.push('Status must be PENDING, DEPOSITED, CLEARED, or BOUNCED');
    }

    // Status-specific date validation
    if (status === 'DEPOSITED' && !depositDate) {
      errors.push('Deposit date is required when status is DEPOSITED');
    }
    if (status === 'CLEARED' && !clearedDate) {
      errors.push('Cleared date is required when status is CLEARED');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const cheque = await Cheque.findById(req.params.id);

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    // Validate status transitions
    const validTransitions = {
      PENDING: ['DEPOSITED', 'BOUNCED'],
      DEPOSITED: ['CLEARED', 'BOUNCED'],
      CLEARED: [],
      BOUNCED: ['PENDING']
    };

    if (!validTransitions[cheque.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${cheque.status} to ${status}. Valid transitions: ${validTransitions[cheque.status].join(', ') || 'none'}`
      });
    }

    cheque.status = status;
    if (depositDate) cheque.depositDate = new Date(depositDate);
    if (clearedDate) cheque.clearedDate = new Date(clearedDate);

    await cheque.save();
    await cheque.populate('customer', 'name phone');

    res.status(200).json({
      success: true,
      message: `Cheque status updated to ${status}`,
      data: cheque
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a cheque (only PENDING)
// @route   DELETE /api/cheques/:id
exports.deleteCheque = async (req, res, next) => {
  try {
    const cheque = await Cheque.findById(req.params.id);

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    if (cheque.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Only PENDING cheques can be deleted. Current status: ${cheque.status}`
      });
    }

    await Cheque.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Cheque deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
