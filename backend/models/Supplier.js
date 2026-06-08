const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true
  },
  contactPerson: {
    type: String,
    required: [true, 'Contact person is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function (v) {
        return /^[+]?[\d\s-]{9,15}$/.test(v);
      },
      message: 'Phone number must be 9-15 digits, may start with +'
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        if (!v) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  address: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        if (!v) return true;
        return /^[a-zA-Z0-9\s,.\-/#]+$/.test(v);
      },
      message: 'Address may only contain letters, numbers, and common punctuation (,.-/#)'
    }
  },
  outstandingPayable: {
    type: Number,
    default: 0,
    validate: {
      validator: function (v) { return v >= 0; },
      message: 'Outstanding payable cannot be negative'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'INACTIVE'],
      message: 'Status must be ACTIVE or INACTIVE'
    },
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Supplier', supplierSchema);
