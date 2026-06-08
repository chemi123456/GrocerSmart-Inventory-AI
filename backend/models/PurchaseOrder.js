const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    validate: {
      validator: function (v) { return v > 0; },
      message: 'Quantity must be greater than 0'
    }
  },
  unitCost: {
    type: Number,
    required: [true, 'Unit cost is required'],
    validate: {
      validator: function (v) { return v > 0; },
      message: 'Unit cost must be greater than 0'
    }
  },
  subtotal: {
    type: Number,
    required: true
  }
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    unique: true,
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  items: {
    type: [purchaseOrderItemSchema],
    validate: {
      validator: function (v) { return v.length > 0; },
      message: 'Purchase order must contain at least one item'
    }
  },
  totalCost: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: {
      values: ['PENDING', 'RECEIVED', 'CANCELLED'],
      message: 'Status must be PENDING, RECEIVED, or CANCELLED'
    },
    default: 'PENDING'
  },
  receivedDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Auto-generate PO number
purchaseOrderSchema.pre('validate', async function (next) {
  if (!this.poNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    const date = new Date();
    const prefix = `PO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    this.poNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Calculate total before saving
purchaseOrderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.subtotal = item.quantity * item.unitCost;
    });
    this.totalCost = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  }
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
