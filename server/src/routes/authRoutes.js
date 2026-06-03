import express from 'express';
import { body, validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import DeliveryPartner from '../models/DeliveryPartner.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createToken } from '../utils/token.js';

const router = express.Router();
const googleClient = new OAuth2Client();

function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  return next();
}

function farmerVerificationValidators() {
  return [
    body('phone')
      .if(body('role').equals('farmer'))
      .trim()
      .isLength({ min: 8 })
      .withMessage('Farmer phone number is required for verification.'),
    body('village')
      .if(body('role').equals('farmer'))
      .trim()
      .isLength({ min: 2 })
      .withMessage('Farm village or city is required.'),
    body('farmName')
      .if(body('role').equals('farmer'))
      .trim()
      .isLength({ min: 2 })
      .withMessage('Farm name is required for farmer verification.'),
    body('farmAddress')
      .if(body('role').equals('farmer'))
      .trim()
      .isLength({ min: 8 })
      .withMessage('Farm address is required for verification.'),
    body('verificationIdType')
      .if(body('role').equals('farmer'))
      .isIn(['aadhaar', 'pan', 'voter_id', 'farm_certificate', 'other'])
      .withMessage('Choose a valid verification document type.'),
    body('verificationIdNumber')
      .if(body('role').equals('farmer'))
      .trim()
      .isLength({ min: 4 })
      .withMessage('Verification document number is required.'),
    body('experienceYears')
      .if(body('role').equals('farmer'))
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 80 })
      .withMessage('Experience years must be valid.')
  ];
}

function deliveryPartnerValidators() {
  return [
    body('phone')
      .if(body('role').equals('delivery'))
      .trim()
      .isLength({ min: 8 })
      .withMessage('Delivery partner phone number is required.'),
    body('village')
      .if(body('role').equals('delivery'))
      .trim()
      .isLength({ min: 2 })
      .withMessage('Primary delivery city or area is required.'),
    body('serviceAreas')
      .if(body('role').equals('delivery'))
      .trim()
      .isLength({ min: 2 })
      .withMessage('Add at least one service area.'),
    body('vehicleType')
      .if(body('role').equals('delivery'))
      .isIn(['EV bike', 'Bike', 'Auto', 'Mini truck', 'Van'])
      .withMessage('Choose a valid vehicle type.'),
    body('vehicleNumber')
      .if(body('role').equals('delivery'))
      .trim()
      .isLength({ min: 3 })
      .withMessage('Vehicle number is required.'),
    body('licenseNumber')
      .if(body('role').equals('delivery'))
      .trim()
      .isLength({ min: 4 })
      .withMessage('License number is required.')
  ];
}

function parseServiceAreas(value = '') {
  return value
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean)
    .slice(0, 12);
}

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
    body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('role').isIn(['farmer', 'customer', 'delivery']).withMessage('Choose customer, farmer, or delivery partner.'),
    ...farmerVerificationValidators(),
    ...deliveryPartnerValidators()
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const {
      name,
      email,
      password,
      role,
      phone = '',
      village = '',
      farmName = '',
      farmAddress = '',
      farmSize = '',
      experienceYears = 0,
      verificationIdType = '',
      verificationIdNumber = '',
      serviceAreas = '',
      vehicleType = 'EV bike',
      vehicleNumber = '',
      licenseNumber = ''
    } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    const farmerProfile =
      role === 'farmer'
        ? {
            farmName,
            farmAddress,
            farmSize,
            experienceYears: Number(experienceYears || 0),
            verificationIdType,
            verificationIdNumber,
            verificationStatus: 'pending',
            verificationSubmittedAt: new Date()
          }
        : {
            verificationStatus: 'not_required'
          };

    const user = await User.create({ name, email, password, role, phone, village, farmerProfile });

    if (role === 'delivery') {
      await DeliveryPartner.create({
        user: user._id,
        serviceAreas: parseServiceAreas(serviceAreas || village),
        vehicleType,
        vehicleNumber,
        licenseNumber,
        status: 'approved',
        isAvailable: true
      });
    }

    return res.status(201).json({
      user: user.toSafeObject(),
      token: createToken(user)
    });
  })
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json({
      user: user.toSafeObject(),
      token: createToken(user)
    });
  })
);

router.post(
  '/google',
  [body('credential').notEmpty().withMessage('Google credential is required.')],
  handleValidation,
  asyncHandler(async (req, res) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      return res.status(500).json({ message: 'Google login is not configured.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: googleClientId
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ message: 'Google account email is not verified.' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email }).select('+googleId +password');

    if (user) {
      if (user.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({ message: 'This email is linked to another Google account.' });
      }

      if (!user.googleId) {
        user.googleId = payload.sub;
        if (user.authProvider !== 'local') {
          user.authProvider = 'google';
        }
        await user.save();
      }
    } else {
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        role: 'customer',
        authProvider: 'google',
        googleId: payload.sub,
        farmerProfile: {
          verificationStatus: 'not_required'
        }
      });
    }

    return res.json({
      user: user.toSafeObject(),
      token: createToken(user)
    });
  })
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    return res.json({ user: req.user.toSafeObject() });
  })
);

export default router;
