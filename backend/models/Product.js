const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  unitConfig: {
    bulkUnit: {
      type: String,
      required: [true, 'Bulk unit is required (e.g., kg, box, crate)'],
      trim: true
    },
    retailUnit: {
      type: String,
      required: [true, 'Retail unit is required (e.g., g, piece, item)'],
      trim: true
    },
    conversionFactor: {
      type: Number,
      required: [true, 'Conversion factor is required'],
      validate: {
        validator: function (v) { return v > 0; },
        message: 'Conversion factor must be greater than 0'
      }
    }
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    validate: {
      validator: function (v) { return v > 0; },
      message: 'Unit price must be greater than 0'
    }
  },
  bulkPrice: {
    type: Number,
    required: [true, 'Bulk price is required'],
    validate: {
      validator: function (v) { return v > 0; },
      message: 'Bulk price must be greater than 0'
    }
  },
  purchasePrice: {
    type: Number,
    default: 0,
    validate: {
      validator: function (v) { return v >= 0; },
      message: 'Purchase price cannot be negative'
    }
  },
  bulkStock: {
    type: Number,
    default: 0,
    validate: {
      validator: function (v) { return v >= 0; },
      message: 'Bulk stock cannot be negative'
    }
  },
  retailStock: {
    type: Number,
    default: 0,
    validate: {
      validator: function (v) { return v >= 0; },
      message: 'Retail stock cannot be negative'
    }
  },
  reorderPoint: {
    type: Number,
    default: 1,
    validate: {
      validator: function (v) { return Number.isInteger(v) && v >= 1; },
      message: 'Reorder point must be an integer >= 1'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'DISCONTINUED'],
      message: 'Status must be ACTIVE or DISCONTINUED'
    },
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
