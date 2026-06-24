const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  total: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'whatsapp'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'pending_whatsapp', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'whatsapp'],
    default: 'stripe'
  },
  shippingAddress: {
    address: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String },
    notes: { type: String }
  },
  phone: {
    type: String
  },
    paymentIntentId: {
    type: String,
    unique: true,
    sparse: true
  },
  statusHistory: [{
    status: String,
    date: { type: Date, default: Date.now },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, {
  timestamps: true
});

orderSchema.index({ user: 1 });
// paymentIntentId index is already defined as unique schema field

orderSchema.index({ status: 1 });
orderSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model('Order', orderSchema);
