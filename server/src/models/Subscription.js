import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ['inactive', 'active', 'expired'],
      default: 'inactive'
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true,
      default: 'INR'
    },
    gateway: {
      type: String,
      default: 'mock'
    },
    paymentReference: {
      type: String,
      default: ''
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  },
  { timestamps: true }
);

subscriptionSchema.methods.isActive = function isActive() {
  return this.status === 'active' && this.currentPeriodEnd && this.currentPeriodEnd > new Date();
};

export default mongoose.model('Subscription', subscriptionSchema);
