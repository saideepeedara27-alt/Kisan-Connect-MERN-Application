import jwt from 'jsonwebtoken';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have access to this action.' });
    }

    return next();
  };
}

export function requireVerifiedFarmer(req, res, next) {
  if (req.user.role !== 'farmer') {
    return res.status(403).json({ message: 'Only farmers need verification access.' });
  }

  if (req.user.farmerProfile?.verificationStatus !== 'approved') {
    return res.status(403).json({
      message: 'Admin approval is required before listing farm products.'
    });
  }

  return next();
}

export const requireActiveSubscription = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'farmer') {
    return res.status(403).json({ message: 'Only farmers need subscription access.' });
  }

  const subscription = await Subscription.findOne({ farmer: req.user._id });

  if (!subscription || !subscription.isActive()) {
    return res.status(402).json({
      message: 'Please activate your farmer subscription before listing products.'
    });
  }

  req.subscription = subscription;
  return next();
});
