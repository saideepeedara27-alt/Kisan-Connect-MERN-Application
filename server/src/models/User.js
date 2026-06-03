import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['farmer', 'customer', 'admin', 'delivery'],
      required: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    village: {
      type: String,
      trim: true,
      default: ''
    },
    farmerProfile: {
      farmName: {
        type: String,
        trim: true,
        default: ''
      },
      farmAddress: {
        type: String,
        trim: true,
        default: ''
      },
      farmSize: {
        type: String,
        trim: true,
        default: ''
      },
      experienceYears: {
        type: Number,
        min: 0,
        default: 0
      },
      verificationIdType: {
        type: String,
        enum: ['', 'aadhaar', 'pan', 'voter_id', 'farm_certificate', 'other'],
        default: ''
      },
      verificationIdNumber: {
        type: String,
        trim: true,
        default: ''
      },
      verificationStatus: {
        type: String,
        enum: ['not_required', 'pending', 'approved', 'rejected'],
        default: 'not_required'
      },
      verificationSubmittedAt: Date,
      verificationReviewedAt: Date,
      ratingAverage: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
      },
      ratingCount: {
        type: Number,
        min: 0,
        default: 0
      }
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const safeFarmerProfile =
    this.role === 'farmer' && this.farmerProfile
      ? {
          farmName: this.farmerProfile.farmName,
          farmAddress: this.farmerProfile.farmAddress,
          farmSize: this.farmerProfile.farmSize,
          experienceYears: this.farmerProfile.experienceYears,
          verificationIdType: this.farmerProfile.verificationIdType,
          verificationStatus: this.farmerProfile.verificationStatus,
          verificationSubmittedAt: this.farmerProfile.verificationSubmittedAt,
          verificationReviewedAt: this.farmerProfile.verificationReviewedAt,
          ratingAverage: this.farmerProfile.ratingAverage || 0,
          ratingCount: this.farmerProfile.ratingCount || 0
        }
      : undefined;

  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    village: this.village,
    farmerProfile: safeFarmerProfile
  };
};

export default mongoose.model('User', userSchema);
