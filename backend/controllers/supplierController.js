const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');

// @desc    Create a new supplier
// @route   POST /api/suppliers
exports.createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, email, address } = req.body;
    const errors = [];

    if (!name || !name.trim()) errors.push('Supplier name is required');
    if (!contactPerson || !contactPerson.trim()) errors.push('Contact person is required');

    if (!phone || !phone.trim()) {
      errors.push('Phone number is required');
    } else if (!/^[+]?[\d\s-]{9,15}$/.test(phone.trim())) {
      errors.push('Phone number must be 9-15 digits');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Please provide a valid email address');
    }

    if (address && !/^[a-zA-Z0-9\s,.\-/#]+$/.test(address.trim())) {
      errors.push('Address may only contain letters, numbers, and common punctuation');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      address: address ? address.trim() : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all suppliers
// @route   GET /api/suppliers
exports.getAllSuppliers = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status.toUpperCase();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single supplier with purchase orders
// @route   GET /api/suppliers/:id
exports.getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const purchaseOrders = await PurchaseOrder.find({ supplier: req.params.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...supplier.toObject(),
        purchaseOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
exports.updateSupplier = async (req, res, next) => {
  try {
    const { phone, email, address, status } = req.body;
    const errors = [];

    if (phone !== undefined && !/^[+]?[\d\s-]{9,15}$/.test(phone.trim())) {
      errors.push('Phone number must be 9-15 digits');
    }
    if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Please provide a valid email');
    }
    if (address !== undefined && address && !/^[a-zA-Z0-9\s,.\-/#]+$/.test(address.trim())) {
      errors.push('Address contains invalid characters');
    }
    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      errors.push('Status must be ACTIVE or INACTIVE');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete supplier (only if inactive and no pending POs)
// @route   DELETE /api/suppliers/:id
exports.deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check for pending POs
    const pendingPOs = await PurchaseOrder.countDocuments({
      supplier: req.params.id,
      status: 'PENDING'
    });

    if (pendingPOs > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier with ${pendingPOs} pending purchase order(s). Cancel or receive them first.`
      });
    }

    await Supplier.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ===================== Purchase Order Operations =====================

// @desc    Create purchase order
// @route   POST /api/suppliers/:supplierId/purchase-orders
exports.createPurchaseOrder = async (req, res, next) => {
  try {
    const { items, notes } = req.body;
    const supplierId = req.params.supplierId;
    const errors = [];

    // Validate supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    if (supplier.status === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create PO for an inactive supplier'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push('Purchase order must have at least one item');
    } else {
      for (let i = 0; i < items.length; i++) {
        if (!items[i].product) errors.push(`Item ${i + 1}: Product is required`);
        if (!items[i].quantity || Number(items[i].quantity) <= 0) errors.push(`Item ${i + 1}: Quantity must be > 0`);
        if (!items[i].unitCost || Number(items[i].unitCost) <= 0) errors.push(`Item ${i + 1}: Unit cost must be > 0`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Enrich with product names
    for (let item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }
      item.productName = product.name;
      item.subtotal = item.quantity * item.unitCost;
    }

    const po = await PurchaseOrder.create({
      supplier: supplierId,
      items,
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: po
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
exports.getAllPurchaseOrders = async (req, res, next) => {
  try {
    const { status, supplierId } = req.query;
    const filter = {};

    if (status) filter.status = status.toUpperCase();
    if (supplierId) filter.supplier = supplierId;

    const orders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name contactPerson phone')
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

// @desc    Update PO status (receive goods)
// @route   PUT /api/purchase-orders/:id
exports.updatePurchaseOrder = async (req, res, next) => {
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (po.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Only PENDING orders can be updated. Current status: ${po.status}`
      });
    }

    if (!['RECEIVED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be RECEIVED or CANCELLED'
      });
    }

    po.status = status;

    // If received, update product stock and set received date
    if (status === 'RECEIVED') {
      po.receivedDate = new Date();
      for (let item of po.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { bulkStock: item.quantity }
        });
      }

      // Update supplier outstanding payable
      await Supplier.findByIdAndUpdate(po.supplier, {
        $inc: { outstandingPayable: po.totalCost }
      });
    }

    await po.save();

    res.status(200).json({
      success: true,
      message: `Purchase order ${status.toLowerCase()}`,
      data: po
    });
  } catch (error) {
    next(error);
  }
};
