import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    productLocation: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    lineTotal: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'placed'
    },
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        trim: true,
        maxlength: 240,
        default: ''
      },
      ratedAt: Date
    }
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    items: [orderItemSchema],
    deliveryAddress: {
      type: String,
      required: true,
      trim: true
    },
    deliveryLocation: {
      type: String,
      trim: true,
      default: ''
    },
    subtotal: {
      type: Number,
      required: true
    },
    platformFee: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true,
      default: 'INR'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'paid'
    },
    paymentReference: {
      type: String,
      default: ''
    },
    deliveryPartner: {
      partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPartner'
      },
      name: {
        type: String,
        default: ''
      },
      riderName: {
        type: String,
        default: ''
      },
      phone: {
        type: String,
        default: ''
      },
      vehicle: {
        type: String,
        default: 'EV bike'
      },
      trackingCode: {
        type: String,
        default: ''
      },
      etaMinutes: {
        type: Number,
        min: 0,
        default: 45
      },
      status: {
        type: String,
        enum: ['pending_assignment', 'assigned', 'accepted', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'pending_assignment'
      },
      assignedAt: Date,
      updatedAt: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
