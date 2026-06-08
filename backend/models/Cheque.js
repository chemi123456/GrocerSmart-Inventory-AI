const mongoose = require('mongoose');

const chequeSchema = new mongoose.Schema({
  chequeNumber: {
    type: String,
    required: [true, 'Cheque number is required'],
    validate: {
      validator: function (v) {
        return /^\d{6}$/.test(v);
      },
      message: 'Cheque number must be exactly 6 digits'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Cheque amount is required'],
    validate: {
      validator: function (v) { return v > 0; },
      message: 'Cheque amount must be greater than 0'
    }
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true
  },
  issuedDate: {
    type: Date,
    required: [true, 'Issued date is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  depositDate: {
    type: Date,
    default: null
  },
  clearedDate: {
    type: Date,
    default: null
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreditCustomer',
    required: [true, 'Customer reference is required']
  },
  type: {
    type: String,
    enum: {
      values: ['INCOMING', 'OUTGOING'],
      message: 'Type must be INCOMING or OUTGOING'
    },
    default: 'INCOMING'
  },
  status: {
    type: String,
    enum: {
      values: ['PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED'],
      message: 'Status must be PENDING, DEPOSITED, CLEARED, or BOUNCED'
    },
    default: 'PENDING'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cheque', chequeSchema);
