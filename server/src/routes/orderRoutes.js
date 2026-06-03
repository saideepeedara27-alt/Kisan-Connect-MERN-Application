import express from 'express';
import { body, validationResult } from 'express-validator';
import { allowRoles, protect } from '../middleware/auth.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const activeDeliveryStatuses = ['assigned', 'accepted', 'picked_up', 'out_for_delivery'];
const farmerOrderStatusTransitions = {
  placed: ['confirmed', 'packed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['cancelled']
};

function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  return next();
}

function createTrackingCode() {
  return `KC-${Date.now().toString(36).toUpperCase()}`;
}

function normalizeLocation(value = '') {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}\s,.-]/gu, ' ')
    .replace(/[,.+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getLocationWords(value) {
  return normalizeLocation(value)
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

function getLocationMatchScore(deliveryLocation, serviceArea) {
  const normalizedDeliveryLocation = normalizeLocation(deliveryLocation);
  const normalizedServiceArea = normalizeLocation(serviceArea);

  if (!normalizedDeliveryLocation || !normalizedServiceArea) {
    return 0;
  }

  if (normalizedDeliveryLocation === normalizedServiceArea) {
    return 100;
  }

  const paddedDeliveryLocation = ` ${normalizedDeliveryLocation} `;
  const paddedServiceArea = ` ${normalizedServiceArea} `;

  if (paddedDeliveryLocation.includes(paddedServiceArea)) {
    return 90;
  }

  if (paddedServiceArea.includes(paddedDeliveryLocation)) {
    return 80;
  }

  const deliveryWords = new Set(getLocationWords(normalizedDeliveryLocation));
  const serviceWords = getLocationWords(normalizedServiceArea);

  if (deliveryWords.size === 0 || serviceWords.length === 0) {
    return 0;
  }

  const matchingWords = serviceWords.filter((word) => deliveryWords.has(word)).length;

  if (matchingWords === 0) {
    return 0;
  }

  return Math.round((matchingWords / serviceWords.length) * 70);
}

function getPartnerServiceAreas(partner) {
  const serviceAreas = partner.serviceAreas?.length ? partner.serviceAreas : [];
  const homeArea = partner.user?.village ? [partner.user.village] : [];

  return [...serviceAreas, ...homeArea].filter(Boolean);
}

function getBestLocationMatchScore(partner, deliveryLocation) {
  return getPartnerServiceAreas(partner).reduce(
    (bestScore, serviceArea) => Math.max(bestScore, getLocationMatchScore(deliveryLocation, serviceArea)),
    0
  );
}

function createPendingDeliveryPartner() {
  return {
    name: process.env.FAST_DELIVERY_PROVIDER || 'Kisan Connect Delivery',
    riderName: 'Assigning partner',
    phone: process.env.FAST_DELIVERY_PHONE || '+918880045045',
    vehicle: '',
    trackingCode: createTrackingCode(),
    etaMinutes: Number(process.env.FAST_DELIVERY_ETA_MINUTES || 45),
    status: 'pending_assignment',
    assignedAt: new Date(),
    updatedAt: new Date()
  };
}

async function assignDeliveryPartner(deliveryLocation) {
  const normalizedDeliveryLocation = normalizeLocation(deliveryLocation);

  if (!normalizedDeliveryLocation) {
    return createPendingDeliveryPartner();
  }

  const partners = await DeliveryPartner.find({ status: 'approved', isAvailable: true })
    .populate('user', 'name phone village')
    .lean();

  if (partners.length === 0) {
    return createPendingDeliveryPartner();
  }

  const matchingPartners = partners
    .map((partner) => ({
      partner,
      locationScore: getBestLocationMatchScore(partner, normalizedDeliveryLocation)
    }))
    .filter((match) => match.locationScore > 0);

  if (matchingPartners.length === 0) {
    return createPendingDeliveryPartner();
  }

  const rankedPartners = await Promise.all(
    matchingPartners.map(async ({ partner, locationScore }) => {
      const activeLoad = await Order.countDocuments({
        'deliveryPartner.partner': partner._id,
        'deliveryPartner.status': { $in: activeDeliveryStatuses }
      });

      return { partner, locationScore, activeLoad };
    })
  );

  rankedPartners.sort(
    (left, right) =>
      right.locationScore - left.locationScore ||
      left.activeLoad - right.activeLoad ||
      (right.partner.completedDeliveries || 0) - (left.partner.completedDeliveries || 0)
  );
  const selected = rankedPartners[0].partner;
  const trackingCode = createTrackingCode();

  return {
    partner: selected._id,
    name: process.env.FAST_DELIVERY_PROVIDER || 'Kisan Connect Delivery',
    riderName: selected.user?.name || 'Delivery partner',
    phone: selected.user?.phone || process.env.FAST_DELIVERY_PHONE || '+918880045045',
    vehicle: [selected.vehicleType, selected.vehicleNumber].filter(Boolean).join(' - '),
    trackingCode,
    etaMinutes: Number(process.env.FAST_DELIVERY_ETA_MINUTES || 45),
    status: 'assigned',
    assignedAt: new Date(),
    updatedAt: new Date()
  };
}

function getDeliveryPartnerStatus(items, currentStatus = 'assigned') {
  const statuses = items.map((item) => item.status);

  if (statuses.every((status) => status === 'cancelled')) {
    return 'cancelled';
  }

  if (statuses.length > 0 && statuses.every((status) => status === 'delivered')) {
    return 'delivered';
  }

  return currentStatus;
}

function farmerPopulateFields() {
  return 'name phone village farmerProfile.farmName farmerProfile.ratingAverage farmerProfile.ratingCount';
}

router.post(
  '/',
  protect,
  allowRoles('customer'),
  [
    body('items').isArray({ min: 1 }).withMessage('Add products to your cart first.'),
    body('items.*.productId').notEmpty().withMessage('Product id is required.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
    body('deliveryLocation').trim().isLength({ min: 2 }).withMessage('Delivery city or area is required.'),
    body('deliveryAddress').trim().isLength({ min: 10 }).withMessage('Delivery address is required.')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const normalizedItems = Array.from(
      req.body.items
        .reduce((map, item) => {
          const current = map.get(item.productId) || 0;
          map.set(item.productId, current + Number(item.quantity));
          return map;
        }, new Map())
        .entries()
    ).map(([productId, quantity]) => ({ productId, quantity }));
    const productIds = normalizedItems.map((item) => item.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true
    });

    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const orderItems = [];

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        return res.status(404).json({ message: 'One product in the cart is no longer available.' });
      }

      const quantity = Number(item.quantity);

      if (product.stock < quantity) {
        return res.status(400).json({
          message: `${product.name} has only ${product.stock} ${product.unit} available.`
        });
      }

      orderItems.push({
        product: product._id,
        farmer: product.farmer,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
        unit: product.unit,
        productLocation: product.location,
        quantity,
        lineTotal: product.price * quantity
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const platformFee = Number(process.env.CUSTOMER_PLATFORM_FEE || 15);
    const total = subtotal + platformFee;
    const paymentReference = req.body.paymentReference || `mock-order-${Date.now()}`;
    const reservedItems = [];

    try {
      for (const item of orderItems) {
        const result = await Product.updateOne(
          {
            _id: item.product,
            isActive: true,
            stock: { $gte: item.quantity }
          },
          { $inc: { stock: -item.quantity } }
        );

        if (result.modifiedCount !== 1) {
          await Promise.all(
            reservedItems.map((reservedItem) =>
              Product.updateOne(
                { _id: reservedItem.product },
                { $inc: { stock: reservedItem.quantity } }
              )
            )
          );

          return res.status(400).json({
            message: `${item.name} does not have enough stock anymore. Please refresh your cart.`
          });
        }

        reservedItems.push(item);
      }

      const deliveryPartner = await assignDeliveryPartner(req.body.deliveryLocation);
      const order = await Order.create({
        customer: req.user._id,
        items: orderItems,
        deliveryAddress: req.body.deliveryAddress,
        deliveryLocation: req.body.deliveryLocation,
        subtotal,
        platformFee,
        total,
        currency: process.env.CURRENCY || 'INR',
        paymentStatus: 'paid',
        paymentReference,
        deliveryPartner
      });

      if (deliveryPartner.partner) {
        await DeliveryPartner.updateOne({ _id: deliveryPartner.partner }, { $set: { isAvailable: false } });
      }

      const populatedOrder = await Order.findById(order._id)
        .populate('customer', 'name email phone village')
        .populate('items.farmer', farmerPopulateFields());

      return res.status(201).json({ order: populatedOrder });
    } catch (error) {
      await Promise.all(
        reservedItems.map((reservedItem) =>
          Product.updateOne({ _id: reservedItem.product }, { $inc: { stock: reservedItem.quantity } })
        )
      );
      throw error;
    }
  })
);

router.get(
  '/my',
  protect,
  allowRoles('customer'),
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.farmer', farmerPopulateFields())
      .sort({ createdAt: -1 });

    return res.json({ orders });
  })
);

router.get(
  '/farmer',
  protect,
  allowRoles('farmer'),
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ 'items.farmer': req.user._id })
      .populate('customer', 'name email phone village')
      .sort({ createdAt: -1 });

    const trimmedOrders = orders.map((order) => ({
      ...order.toObject(),
      items: order.items.filter((item) => item.farmer.toString() === req.user._id.toString())
    }));

    return res.json({ orders: trimmedOrders });
  })
);

router.patch(
  '/:orderId/items/:itemId/status',
  protect,
  allowRoles('farmer'),
  [
    body('status')
      .isIn(['confirmed', 'packed', 'cancelled'])
      .withMessage('Farmers can only confirm, pack, or cancel order items.')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const item = order.items.id(req.params.itemId);

    if (!item || item.farmer.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order item not found.' });
    }

    const previousDeliveryStatus = order.deliveryPartner?.status;
    const nextStatus = req.body.status;
    const allowedNextStatuses = farmerOrderStatusTransitions[item.status] || [];
    let newlyAssignedDeliveryPartnerId = null;

    if (nextStatus !== item.status && !allowedNextStatuses.includes(nextStatus)) {
      return res.status(400).json({
        message: `Farmer cannot move order item from ${item.status} to ${nextStatus}.`
      });
    }

    item.status = nextStatus;

    if (!order.deliveryPartner?.partner && nextStatus === 'packed') {
      order.deliveryPartner = await assignDeliveryPartner(order.deliveryLocation);
      newlyAssignedDeliveryPartnerId = order.deliveryPartner?.partner;
    } else if (!order.deliveryPartner?.trackingCode) {
      order.deliveryPartner = createPendingDeliveryPartner();
    }
    order.deliveryPartner.status = getDeliveryPartnerStatus(order.items, order.deliveryPartner.status);
    order.deliveryPartner.updatedAt = new Date();
    await order.save();

    if (newlyAssignedDeliveryPartnerId) {
      await DeliveryPartner.updateOne(
        { _id: newlyAssignedDeliveryPartnerId },
        { $set: { isAvailable: false } }
      );
    }

    if (
      order.deliveryPartner?.partner &&
      order.deliveryPartner.status !== previousDeliveryStatus &&
      ['delivered', 'cancelled'].includes(order.deliveryPartner.status)
    ) {
      await DeliveryPartner.updateOne(
        { _id: order.deliveryPartner.partner },
        {
          $set: { isAvailable: true },
          ...(order.deliveryPartner.status === 'delivered' ? { $inc: { completedDeliveries: 1 } } : {})
        }
      );
    }

    return res.json({ order });
  })
);

router.patch(
  '/:orderId/items/:itemId/rating',
  protect,
  allowRoles('customer'),
  [
    body('score').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5 stars.'),
    body('comment').optional({ checkFalsy: true }).trim().isLength({ max: 240 }).withMessage('Review must be under 240 characters.')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.orderId, customer: req.user._id });

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const item = order.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: 'Order item not found.' });
    }

    if (item.status !== 'delivered') {
      return res.status(400).json({ message: 'You can rate a farm after the product is delivered.' });
    }

    const previousScore = item.rating?.score || 0;
    const nextScore = Number(req.body.score);
    item.rating = {
      score: nextScore,
      comment: req.body.comment || '',
      ratedAt: new Date()
    };

    await order.save();

    const farmer = await User.findById(item.farmer);
    if (farmer?.farmerProfile) {
      const currentCount = farmer.farmerProfile.ratingCount || 0;
      const replacesExistingAggregate = previousScore && currentCount > 0;
      const nextCount = replacesExistingAggregate ? currentCount : currentCount + 1;
      const currentTotal = (farmer.farmerProfile.ratingAverage || 0) * currentCount;
      const nextTotal = replacesExistingAggregate ? currentTotal - previousScore + nextScore : currentTotal + nextScore;

      farmer.farmerProfile.ratingCount = nextCount;
      farmer.farmerProfile.ratingAverage = Number((nextTotal / nextCount).toFixed(2));
      await farmer.save();
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone village')
      .populate('items.farmer', farmerPopulateFields());

    return res.json({ order: populatedOrder });
  })
);

export default router;
