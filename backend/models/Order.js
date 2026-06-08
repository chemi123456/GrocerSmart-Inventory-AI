const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required for each order item']
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
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    validate: {
      validator: function (v) { return v > 0; },
      message: 'Unit price must be greater than 0'
    }
  },
  subtotal: {
    type: Number,
    required: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: function (v) { return v.length > 0; },
      message: 'Order must contain at least one item'
    }
  },
  paymentType: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: {
      values: ['CASH', 'CARD', 'CREDIT'],
      message: 'Payment type must be CASH, CARD, or CREDIT'
    }
  },
  creditCustomer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreditCustomer',
    validate: {
      validator: function (v) {
        // Required only if paymentType is CREDIT
        if (this.paymentType === 'CREDIT' && !v) return false;
        return true;
      },
      message: 'Credit customer is required for credit sales'
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: {
      values: ['DRAFT', 'COMPLETED', 'CANCELLED', 'VOIDED'],
      message: 'Status must be DRAFT, COMPLETED, CANCELLED, or VOIDED'
    },
    default: 'DRAFT'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Auto-generate invoice number before saving
orderSchema.pre('validate', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Order').countDocuments();
    const date = new Date();
    const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    this.invoiceNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Calculate total before saving
orderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.subtotal = item.quantity * item.unitPrice;
    });
    this.totalAmount = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
