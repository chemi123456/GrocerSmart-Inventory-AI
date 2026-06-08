const Product = require('../models/Product');

// @desc    Create a new product
// @route   POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const { name, category, description, unitConfig, unitPrice, bulkPrice, purchasePrice, bulkStock, retailStock, reorderPoint } = req.body;
    const errors = [];

    // Required fields
    if (!name || !name.trim()) errors.push('Product name is required');
    if (!category || !category.trim()) errors.push('Category is required');

    // Unit config validation
    if (!unitConfig || typeof unitConfig !== 'object') {
      errors.push('Unit configuration is required');
    } else {
      if (!unitConfig.bulkUnit || !unitConfig.bulkUnit.trim()) errors.push('Bulk unit is required (e.g., kg, box)');
      if (!unitConfig.retailUnit || !unitConfig.retailUnit.trim()) errors.push('Retail unit is required (e.g., g, piece)');
      if (unitConfig.conversionFactor === undefined || unitConfig.conversionFactor === null) {
        errors.push('Conversion factor is required');
      } else if (Number(unitConfig.conversionFactor) <= 0) {
        errors.push('Conversion factor must be greater than 0');
      }
    }

    // Price validation
    if (unitPrice === undefined || unitPrice === null) {
      errors.push('Unit price is required');
    } else if (Number(unitPrice) <= 0) {
      errors.push('Unit price must be greater than 0');
    }

    if (bulkPrice === undefined || bulkPrice === null) {
      errors.push('Bulk price is required');
    } else if (Number(bulkPrice) <= 0) {
      errors.push('Bulk price must be greater than 0');
    }

    if (purchasePrice !== undefined && Number(purchasePrice) < 0) {
      errors.push('Purchase price cannot be negative');
    }

    // Stock validation
    if (bulkStock !== undefined && Number(bulkStock) < 0) errors.push('Bulk stock cannot be negative');
    if (retailStock !== undefined && Number(retailStock) < 0) errors.push('Retail stock cannot be negative');

    // Reorder point
    if (reorderPoint !== undefined) {
      if (!Number.isInteger(Number(reorderPoint)) || Number(reorderPoint) < 1) {
        errors.push('Reorder point must be an integer >= 1');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products
// @route   GET /api/products
exports.getAllProducts = async (req, res, next) => {
  try {
    const { category, status, search, lowStock } = req.query;
    const filter = {};

    if (category) filter.category = { $regex: category, $options: 'i' };
    if (status) filter.status = status.toUpperCase();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    let products = await Product.find(filter).sort({ createdAt: -1 });

    // Filter low stock products
    if (lowStock === 'true') {
      products = products.filter(p => (p.bulkStock + p.retailStock) <= p.reorderPoint);
    }

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const errors = [];
    const { unitPrice, bulkPrice, purchasePrice, bulkStock, retailStock, reorderPoint, unitConfig } = req.body;

    // Validate if provided
    if (unitPrice !== undefined && Number(unitPrice) <= 0) errors.push('Unit price must be > 0');
    if (bulkPrice !== undefined && Number(bulkPrice) <= 0) errors.push('Bulk price must be > 0');
    if (purchasePrice !== undefined && Number(purchasePrice) < 0) errors.push('Purchase price cannot be negative');
    if (bulkStock !== undefined && Number(bulkStock) < 0) errors.push('Bulk stock cannot be negative');
    if (retailStock !== undefined && Number(retailStock) < 0) errors.push('Retail stock cannot be negative');
    if (reorderPoint !== undefined && (!Number.isInteger(Number(reorderPoint)) || Number(reorderPoint) < 1)) {
      errors.push('Reorder point must be an integer >= 1');
    }
    if (unitConfig && unitConfig.conversionFactor !== undefined && Number(unitConfig.conversionFactor) <= 0) {
      errors.push('Conversion factor must be > 0');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product (mark as discontinued)
// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.status = 'DISCONTINUED';
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product discontinued successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};
