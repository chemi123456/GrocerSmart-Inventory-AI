const Order = require('../models/Order');
const Product = require('../models/Product');
const CreditCustomer = require('../models/CreditCustomer');

// @desc    Create a new order
// @route   POST /api/orders
exports.createOrder = async (req, res, next) => {
  try {
    const { items, paymentType, creditCustomer, notes } = req.body;
    const errors = [];

    // Payment type validation
    if (!paymentType) {
      errors.push('Payment type is required');
    } else if (!['CASH', 'CARD', 'CREDIT'].includes(paymentType)) {
      errors.push('Payment type must be CASH, CARD, or CREDIT');
    }

    // Credit customer validation
    if (paymentType === 'CREDIT' && !creditCustomer) {
      errors.push('Credit customer is required for credit sales');
    }

    // Items validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push('Order must contain at least one item');
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.product) errors.push(`Item ${i + 1}: Product is required`);
        if (!item.quantity || Number(item.quantity) <= 0) errors.push(`Item ${i + 1}: Quantity must be > 0`);
        if (!item.unitPrice || Number(item.unitPrice) <= 0) errors.push(`Item ${i + 1}: Unit price must be > 0`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Validate credit customer exists and has sufficient limit
    if (paymentType === 'CREDIT') {
      const customer = await CreditCustomer.findById(creditCustomer);
      if (!customer) {
        return res.status(400).json({
          success: false,
          message: 'Credit customer not found'
        });
      }

      // Calculate total
      const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      if (customer.outstandingBalance + total > customer.creditLimit) {
        return res.status(400).json({
          success: false,
          message: `Credit limit exceeded. Available credit: Rs.${(customer.creditLimit - customer.outstandingBalance).toFixed(2)}`
        });
      }
    }

    // Enrich items with product names
    for (let item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }
      item.productName = product.name;
      item.subtotal = item.quantity * item.unitPrice;
    }

    const order = await Order.create({
      items,
      paymentType,
      creditCustomer: paymentType === 'CREDIT' ? creditCustomer : undefined,
      notes,
      createdBy: req.user._id,
      status: 'COMPLETED'
    });

    // Update product stock
    for (let item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { retailStock: -item.quantity }
      });
    }

    // Update credit customer outstanding balance
    if (paymentType === 'CREDIT') {
      await CreditCustomer.findByIdAndUpdate(creditCustomer, {
        $inc: { outstandingBalance: order.totalAmount }
      });
    }

    await order.populate('createdBy', 'fullName username');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const { paymentType, status, search, startDate, endDate } = req.query;
    const filter = {};

    if (paymentType) filter.paymentType = paymentType.toUpperCase();
    if (status) filter.status = status.toUpperCase();
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .populate('createdBy', 'fullName username')
      .populate('creditCustomer', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('createdBy', 'fullName username')
      .populate('creditCustomer', 'name phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an order (only DRAFT orders)
// @route   PUT /api/orders/:id
exports.updateOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Only DRAFT orders can be updated. Current status: ${order.status}`
      });
    }

    const { items, paymentType, notes } = req.body;
    const errors = [];

    if (items) {
      if (!Array.isArray(items) || items.length === 0) {
        errors.push('Order must contain at least one item');
      } else {
        for (let i = 0; i < items.length; i++) {
          if (!items[i].quantity || Number(items[i].quantity) <= 0) errors.push(`Item ${i + 1}: Quantity must be > 0`);
          if (!items[i].unitPrice || Number(items[i].unitPrice) <= 0) errors.push(`Item ${i + 1}: Unit price must be > 0`);
        }
      }
    }

    if (paymentType && !['CASH', 'CARD', 'CREDIT'].includes(paymentType)) {
      errors.push('Payment type must be CASH, CARD, or CREDIT');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    if (items) order.items = items;
    if (paymentType) order.paymentType = paymentType;
    if (notes !== undefined) order.notes = notes;

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel/void an order
// @route   DELETE /api/orders/:id
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status === 'CANCELLED' || order.status === 'VOIDED') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status}`
      });
    }

    // Restore product stock
    for (let item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { retailStock: item.quantity }
      });
    }

    // Reverse credit customer balance
    if (order.paymentType === 'CREDIT' && order.creditCustomer) {
      await CreditCustomer.findByIdAndUpdate(order.creditCustomer, {
        $inc: { outstandingBalance: -order.totalAmount }
      });
    }

    order.status = order.status === 'DRAFT' ? 'CANCELLED' : 'VOIDED';
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order ${order.status.toLowerCase()} successfully`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};
