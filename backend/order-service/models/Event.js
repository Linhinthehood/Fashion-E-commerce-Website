const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: {
    type: String, // allow anonymous/session IDs too
    default: null
  },
  sessionId: {
    type: String,
    required: [true, 'sessionId is required']
  },
  type: {
    type: String,
    required: [true, 'event type is required'],
    enum: {
      values: ['view', 'add_to_cart', 'purchase', 'wishlist', 'search'],
      message: 'Invalid event type'
    }
  },
  itemId: {
    type: String,
    default: null
  },
  variantId: {
    type: String,
    default: null
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  price: {
    type: Number,
    default: null,
    min: 0
  },
  searchQuery: {
    type: String,
    default: null
  },
  context: {
    device: { type: String, default: null },
    geo: { type: String, default: null },
    page: { type: String, default: null },
    referrer: { type: String, default: null }
  },
  occurredAt: {
    type: Date,
    required: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false });

eventSchema.index({ userId: 1, occurredAt: -1 });
eventSchema.index({ sessionId: 1, occurredAt: -1 });
eventSchema.index({ type: 1, occurredAt: -1 });

module.exports = mongoose.model('Event', eventSchema);


