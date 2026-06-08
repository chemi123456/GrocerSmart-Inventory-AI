const CreditCustomer = require('../models/CreditCustomer');

// @desc    Create a credit customer
// @route   POST /api/credit-customers
exports.createCreditCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, creditLimit, paymentTerms } = req.body;
    const errors = [];

    if (!name || !name.trim()) errors.push('Customer name is required');
    if (!phone || !phone.trim()) {
      errors.push('Phone number is required');
    } else if (!/^[+]?[\d\s-]{9,15}$/.test(phone.trim())) {
      errors.push('Phone number must be 9-15 digits');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Please provide a valid email address');
    }

    if (creditLimit === undefined || creditLimit === null) {
      errors.push('Credit limit is required');
    } else if (Number(creditLimit) <= 0) {
      errors.push('Credit limit must be greater than 0');
    }

    if (paymentTerms !== undefined) {
      const terms = Number(paymentTerms);
      if (!Number.isInteger(terms) || terms < 1 || terms > 365) {
        errors.push('Payment terms must be an integer between 1 and 365 days');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const customer = await CreditCustomer.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      address: address ? address.trim() : undefined,
      creditLimit: Number(creditLimit),
      paymentTerms: paymentTerms ? Number(paymentTerms) : 30
    });

    res.status(201).json({
      success: true,
      message: 'Credit customer registered successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all credit customers
// @route   GET /api/credit-customers
exports.getAllCreditCustomers = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status.toUpperCase();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await CreditCustomer.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single credit customer
// @route   GET /api/credit-customers/:id
exports.getCreditCustomer = async (req, res, next) => {
  try {
    const customer = await CreditCustomer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Credit customer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update credit customer / Post payment
// @route   PUT /api/credit-customers/:id
exports.updateCreditCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, creditLimit, paymentTerms, status } = req.body;
    const errors = [];

    if (phone !== undefined && !/^[+]?[\d\s-]{9,15}$/.test(phone.trim())) {
      errors.push('Phone number must be 9-15 digits');
    }
    if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Please provide a valid email');
    }
    if (creditLimit !== undefined && Number(creditLimit) <= 0) {
      errors.push('Credit limit must be > 0');
    }
    if (paymentTerms !== undefined) {
      const terms = Number(paymentTerms);
      if (!Number.isInteger(terms) || terms < 1 || terms > 365) {
        errors.push('Payment terms must be 1-365');
      }
    }
    if (status && !['ACTIVE', 'SETTLED', 'DEFAULTED'].includes(status)) {
      errors.push('Status must be ACTIVE, SETTLED, or DEFAULTED');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const customer = await CreditCustomer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Credit customer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Credit customer updated successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Post a payment for a credit customer
// @route   PUT /api/credit-customers/:id/payment
exports.postPayment = async (req, res, next) => {
  try {
    const { amount, method, note } = req.body;
    const errors = [];

    if (!amount || Number(amount) <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (method && !['CASH', 'CARD', 'CHEQUE', 'BANK_TRANSFER'].includes(method)) {
      errors.push('Payment method must be CASH, CARD, CHEQUE, or BANK_TRANSFER');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const customer = await CreditCustomer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Credit customer not found'
      });
    }

    if (Number(amount) > customer.outstandingBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (Rs.${amount}) exceeds outstanding balance (Rs.${customer.outstandingBalance.toFixed(2)})`
      });
    }

    customer.outstandingBalance -= Number(amount);
    customer.paymentHistory.push({
      amount: Number(amount),
      method: method || 'CASH',
      note: note || ''
    });

    // Auto-settle if balance is zero
    if (customer.outstandingBalance === 0) {
      customer.status = 'SETTLED';
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete credit customer (only if settled)
// @route   DELETE /api/credit-customers/:id
exports.deleteCreditCustomer = async (req, res, next) => {
  try {
    const customer = await CreditCustomer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Credit customer not found'
      });
    }

    if (customer.outstandingBalance > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer with outstanding balance of Rs.${customer.outstandingBalance.toFixed(2)}. Settle all dues first.`
      });
    }

    await CreditCustomer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Credit customer removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
