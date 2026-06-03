import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import SupportTicket from '../models/SupportTicket.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next();
  }

  return protect(req, res, next);
}

function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  return next();
}

router.post(
  '/',
  optionalAuth,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Enter a valid email.'),
    body('phone').optional({ checkFalsy: true }).trim(),
    body('topic')
      .optional()
      .isIn(['order', 'payment', 'subscription', 'product', 'general'])
      .withMessage('Choose a valid support topic.'),
    body('message').trim().isLength({ min: 8 }).withMessage('Please describe the issue.'),
    body('preferredContact')
      .optional()
      .isIn(['chat', 'call', 'email'])
      .withMessage('Choose chat, call, or email.')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const ticket = await SupportTicket.create({
      user: req.user?._id || null,
      name: req.body.name,
      email: req.body.email || req.user?.email || '',
      phone: req.body.phone || req.user?.phone || '',
      role: req.user?.role || req.body.role || 'guest',
      topic: req.body.topic || 'general',
      message: req.body.message,
      preferredContact: req.body.preferredContact || 'chat'
    });

    return res.status(201).json({
      message: 'Support request received.',
      ticket
    });
  })
);

router.get(
  '/mine',
  protect,
  asyncHandler(async (req, res) => {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ tickets });
  })
);

export default router;
