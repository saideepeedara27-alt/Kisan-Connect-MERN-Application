import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['farmer', 'customer', 'guest'],
      default: 'guest'
    },
    topic: {
      type: String,
      enum: ['order', 'payment', 'subscription', 'product', 'general'],
      default: 'general'
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 1000
    },
    preferredContact: {
      type: String,
      enum: ['chat', 'call', 'email'],
      default: 'chat'
    },
    status: {
      type: String,
      enum: ['open', 'in_review', 'resolved'],
      default: 'open'
    }
  },
  { timestamps: true }
);

export default mongoose.model('SupportTicket', supportTicketSchema);
