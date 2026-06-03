import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    serviceAreas: {
      type: [String],
      default: []
    },
    vehicleType: {
      type: String,
      enum: ['EV bike', 'Bike', 'Auto', 'Mini truck', 'Van'],
      default: 'EV bike'
    },
    vehicleNumber: {
      type: String,
      trim: true,
      default: ''
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'blocked'],
      default: 'approved'
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    completedDeliveries: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  { timestamps: true }
);

deliveryPartnerSchema.index({ status: 1, isAvailable: 1 });

export default mongoose.model('DeliveryPartner', deliveryPartnerSchema);
