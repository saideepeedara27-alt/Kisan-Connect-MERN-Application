import express from 'express';
import { allowRoles, protect, requireVerifiedFarmer } from '../middleware/auth.js';
import Subscription from '../models/Subscription.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

function getSubscriptionConfig() {
  return {
    amount: Number(process.env.FARMER_SUBSCRIPTION_AMOUNT || 199),
    currency: process.env.CURRENCY || 'INR'
  };
}

router.get(
  '/',
  protect,
  allowRoles('farmer'),
  asyncHandler(async (req, res) => {
    const config = getSubscriptionConfig();
    const subscription = await Subscription.findOne({ farmer: req.user._id });

    return res.json({
      config,
      subscription,
      isActive: Boolean(subscription?.isActive())
    });
  })
);

router.post(
  '/activate',
  protect,
  allowRoles('farmer'),
  requireVerifiedFarmer,
  asyncHandler(async (req, res) => {
    const config = getSubscriptionConfig();
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const paymentReference =
      req.body.paymentReference || `mock-sub-${Date.now()}-${req.user._id.toString().slice(-5)}`;

    const subscription = await Subscription.findOneAndUpdate(
      { farmer: req.user._id },
      {
        farmer: req.user._id,
        status: 'active',
        amount: config.amount,
        currency: config.currency,
        gateway: 'mock',
        paymentReference,
        currentPeriodStart: start,
        currentPeriodEnd: end
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      subscription,
      isActive: true
    });
  })
);

export default router;
