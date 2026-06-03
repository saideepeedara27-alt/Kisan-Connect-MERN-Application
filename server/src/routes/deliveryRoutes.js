import express from 'express';
import { body, validationResult } from 'express-validator';
import { allowRoles, protect } from '../middleware/auth.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Order from '../models/Order.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const activeDeliveryStatuses = ['assigned', 'accepted', 'picked_up', 'out_for_delivery'];
const allowedTransitions = {
  assigned: ['accepted', 'cancelled'],
  accepted: ['picked_up', 'cancelled'],
  picked_up: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled']
};

function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  return next();
}

function farmerPopulateFields() {
  return 'name phone village farmerProfile.farmName';
}

function activeItems(order) {
  return order.items.filter((item) => item.status !== 'cancelled');
}

async function findDeliveryProfile(userId) {
  return DeliveryPartner.findOne({ user: userId }).populate('user', 'name email phone village');
}

async function populateDeliveryOrder(orderId) {
  return Order.findById(orderId)
    .populate('customer', 'name email phone village')
    .populate('items.farmer', farmerPopulateFields());
}

router.use(protect, allowRoles('delivery'));

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const profile = await findDeliveryProfile(req.user._id);

    if (!profile) {
      return res.status(404).json({ message: 'Delivery partner profile not found.' });
    }

    const orders = await Order.find({ 'deliveryPartner.partner': profile._id })
      .populate('customer', 'name email phone village')
      .populate('items.farmer', farmerPopulateFields())
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ profile, orders });
  })
);

router.patch(
  '/me/availability',
  [body('isAvailable').isBoolean().withMessage('Availability must be true or false.')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const profile = await findDeliveryProfile(req.user._id);

    if (!profile) {
      return res.status(404).json({ message: 'Delivery partner profile not found.' });
    }

    const nextAvailability = req.body.isAvailable === true || req.body.isAvailable === 'true';
    const activeOrderCount = await Order.countDocuments({
      'deliveryPartner.partner': profile._id,
      'deliveryPartner.status': { $in: activeDeliveryStatuses }
    });

    if (nextAvailability && activeOrderCount > 0) {
      return res.status(400).json({
        message: 'Complete or cancel active deliveries before going online for new orders.'
      });
    }

    profile.isAvailable = nextAvailability;
    await profile.save();

    return res.json({ profile });
  })
);

router.patch(
  '/orders/:orderId/status',
  [
    body('status')
      .isIn(['accepted', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'])
      .withMessage('Choose a valid delivery status.')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const profile = await DeliveryPartner.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Delivery partner profile not found.' });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      'deliveryPartner.partner': profile._id
    });

    if (!order) {
      return res.status(404).json({ message: 'Assigned order not found.' });
    }

    const nextStatus = req.body.status;
    const currentStatus = order.deliveryPartner.status;
    const validNextStatuses = allowedTransitions[currentStatus] || [];

    if (!validNextStatuses.includes(nextStatus)) {
      return res.status(400).json({
        message: `Delivery cannot move from ${currentStatus} to ${nextStatus}.`
      });
    }

    order.deliveryPartner.status = nextStatus;
    order.deliveryPartner.updatedAt = new Date();

    if (nextStatus === 'accepted') {
      profile.isAvailable = false;
    }

    if (nextStatus === 'picked_up') {
      activeItems(order).forEach((item) => {
        if (['placed', 'confirmed'].includes(item.status)) {
          item.status = 'packed';
        }
      });
    }

    if (nextStatus === 'out_for_delivery') {
      activeItems(order).forEach((item) => {
        item.status = 'shipped';
      });
    }

    if (nextStatus === 'delivered') {
      activeItems(order).forEach((item) => {
        item.status = 'delivered';
      });
      profile.isAvailable = true;
      if (currentStatus !== 'delivered') {
        profile.completedDeliveries += 1;
      }
    }

    if (nextStatus === 'cancelled') {
      activeItems(order).forEach((item) => {
        item.status = 'cancelled';
      });
      profile.isAvailable = true;
    }

    await Promise.all([order.save(), profile.save()]);

    const populatedOrder = await populateDeliveryOrder(order._id);
    return res.json({ order: populatedOrder, profile });
  })
);

export default router;
