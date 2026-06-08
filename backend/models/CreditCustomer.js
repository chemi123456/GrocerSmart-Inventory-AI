const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) { return v > 0; },
      message: 'Payment amount must be greater than 0'
    }
  },
  date: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    enum: ['CASH', 'CARD', 'CHEQUE', 'BANK_TRANSFER'],
    default: 'CASH'
  },
  note: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: true, timestamps: true });

const creditCustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function (v) {
        return /^[+]?[\d\s-]{9,15}$/.test(v);
      },
      message: 'Please provide a valid phone number (9-15 digits)'
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        if (!v) return true; // optional
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  creditLimit: {
    type: Number,
    required: [true, 'Credit limit is required'],
    validate: {
      validator: function (v) { return v > 0; },
      message: 'Credit limit must be greater than 0'
    }
  },
  outstandingBalance: {
    type: Number,
    default: 0,
    validate: {
      validator: function (v) { return v >= 0; },
      message: 'Outstanding balance cannot be negative'
    }
  },
  paymentTerms: {
    type: Number,
    default: 30,
    validate: {
      validator: function (v) {
        return Number.isInteger(v) && v >= 1 && v <= 365;
      },
      message: 'Payment terms must be an integer between 1 and 365 days'
    }
  },
  paymentHistory: [paymentHistorySchema],
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'SETTLED', 'DEFAULTED'],
      message: 'Status must be ACTIVE, SETTLED, or DEFAULTED'
    },
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CreditCustomer', creditCustomerSchema);
