import express from 'express';
import { body, validationResult } from 'express-validator';
import { allowRoles, protect } from '../middleware/auth.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  return next();
}

router.use(protect, allowRoles('admin'));

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const [
      totalFarmers,
      pendingFarmers,
      approvedFarmers,
      rejectedFarmers,
      deliveryPartners,
      availableDeliveryPartners,
      totalOrders,
      activeDeliveries,
      completedDeliveries,
      pendingAssignments
    ] = await Promise.all([
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'farmer', 'farmerProfile.verificationStatus': 'pending' }),
      User.countDocuments({ role: 'farmer', 'farmerProfile.verificationStatus': 'approved' }),
      User.countDocuments({ role: 'farmer', 'farmerProfile.verificationStatus': 'rejected' }),
      DeliveryPartner.countDocuments({}),
      DeliveryPartner.countDocuments({ status: 'approved', isAvailable: true }),
      Order.countDocuments({}),
      Order.countDocuments({
        'deliveryPartner.status': { $in: ['assigned', 'accepted', 'picked_up', 'out_for_delivery'] }
      }),
      Order.countDocuments({ 'deliveryPartner.status': 'delivered' }),
      Order.countDocuments({ 'deliveryPartner.status': 'pending_assignment' })
    ]);

    return res.json({
      overview: {
        farmers: {
          total: totalFarmers,
          pending: pendingFarmers,
          approved: approvedFarmers,
          rejected: rejectedFarmers
        },
        delivery: {
          partners: deliveryPartners,
          availablePartners: availableDeliveryPartners,
          totalOrders,
          active: activeDeliveries,
          completed: completedDeliveries,
          pendingAssignments
        }
      }
    });
  })
);

router.get(
  '/farmers',
  asyncHandler(async (req, res) => {
    const status = req.query.status || '';
    const query = { role: 'farmer' };

    if (status) {
      query['farmerProfile.verificationStatus'] = status;
    }

    const farmers = await User.find(query)
      .select('name email phone village farmerProfile createdAt')
      .sort({ 'farmerProfile.verificationSubmittedAt': -1, createdAt: -1 });

    return res.json({ farmers });
  })
);

router.patch(
  '/farmers/:id/verification',
  [
    body('status')
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('Choose pending, approved, or rejected.')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const farmer = await User.findOne({ _id: req.params.id, role: 'farmer' });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    farmer.farmerProfile.verificationStatus = req.body.status;
    farmer.farmerProfile.verificationReviewedAt =
      req.body.status === 'pending' ? undefined : new Date();

    await farmer.save();

    return res.json({ farmer: farmer.toSafeObject() });
  })
);

export default router;
