import express from 'express';
import { body, validationResult } from 'express-validator';
import { allowRoles, protect, requireActiveSubscription, requireVerifiedFarmer } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
const categoryAliases = new Map([
  ['vegetable', 'Vegetables'],
  ['vegetables', 'Vegetables'],
  ['fruit', 'Fruits'],
  ['fruits', 'Fruits'],
  ['grain', 'Grains'],
  ['grains', 'Grains'],
  ['dairy', 'Dairy'],
  ['diary', 'Dairy'],
  ['milk', 'Dairy'],
  ['spice', 'Spices'],
  ['spices', 'Spices'],
  ['pulse', 'Pulses'],
  ['pulses', 'Pulses'],
  ['leafy green', 'Leafy Greens'],
  ['leafy greens', 'Leafy Greens']
]);

function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  return next();
}

function resolveImageUrl(req) {
  if (req.file) {
    return `/uploads/${req.file.filename}`;
  }

  return req.body.imageUrl || '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCategory(category = '') {
  const key = category.trim().toLowerCase();
  return categoryAliases.get(key) || category.trim();
}

function categoryMatcher(category) {
  const normalized = normalizeCategory(category);
  const matchingAliases = Array.from(categoryAliases.entries())
    .filter(([, value]) => value === normalized)
    .map(([key]) => escapeRegex(key));
  matchingAliases.push(escapeRegex(normalized));

  return new RegExp(`^(?:${[...new Set(matchingAliases)].join('|')})$`, 'i');
}

function presentProduct(product) {
  return {
    ...product,
    category: normalizeCategory(product.category)
  };
}

function toPositiveInt(value, fallback, max) {
  const number = Number.parseInt(value, 10);

  if (!Number.isFinite(number) || number < 1) {
    return fallback;
  }

  return Math.min(number, max);
}

function buildProductQuery(queryParams) {
  const { search = '', category = '', location = '', minPrice = '', maxPrice = '' } = queryParams;
  const query = {
    isActive: true,
    stock: { $gt: 0 }
  };

  if (search) {
    query.$text = { $search: search };
  }

  if (category) {
    query.category = categoryMatcher(category);
  }

  if (location) {
    query.location = new RegExp(escapeRegex(location), 'i');
  }

  const price = {};
  const min = Number(minPrice);
  const max = Number(maxPrice);

  if (minPrice !== '' && Number.isFinite(min) && min >= 0) {
    price.$gte = min;
  }

  if (maxPrice !== '' && Number.isFinite(max) && max >= 0) {
    price.$lte = max;
  }

  if (Object.keys(price).length > 0) {
    query.price = price;
  }

  return query;
}

async function getApprovedFarmerIds() {
  return User.find({
    role: 'farmer',
    'farmerProfile.verificationStatus': 'approved'
  }).distinct('_id');
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = buildProductQuery(req.query);
    query.farmer = { $in: await getApprovedFarmerIds() };
    const page = toPositiveInt(req.query.page, 1, 500);
    const limit = toPositiveInt(req.query.limit, 12, 36);
    const skip = (page - 1) * limit;
    const sortOptions = {
      newest: { createdAt: -1 },
      priceLow: { price: 1, createdAt: -1 },
      priceHigh: { price: -1, createdAt: -1 },
      stockHigh: { stock: -1, createdAt: -1 }
    };
    const sort = sortOptions[req.query.sort] || sortOptions.newest;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate(
          'farmer',
          'name village phone farmerProfile.verificationStatus farmerProfile.farmName farmerProfile.ratingAverage farmerProfile.ratingCount'
        )
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    return res.json({
      products: products.map(presentProduct),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  })
);

router.get(
  '/meta',
  asyncHandler(async (req, res) => {
    const activeQuery = {
      isActive: true,
      stock: { $gt: 0 },
      farmer: { $in: await getApprovedFarmerIds() }
    };
    const [categories, categoryCounts, locations, priceRange] = await Promise.all([
      Product.distinct('category', activeQuery),
      Product.aggregate([
        { $match: activeQuery },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Product.distinct('location', activeQuery),
      Product.aggregate([
        { $match: activeQuery },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            totalStock: { $sum: '$stock' },
            productCount: { $sum: 1 }
          }
        }
      ])
    ]);

    const normalizedCategoryCounts = categoryCounts.reduce((counts, item) => {
      const category = normalizeCategory(item._id || '');
      counts[category] = (counts[category] || 0) + item.count;
      return counts;
    }, {});

    return res.json({
      categories: [...new Set(categories.filter(Boolean).map(normalizeCategory))].sort(),
      categoryCounts: normalizedCategoryCounts,
      locations: locations.filter(Boolean).sort(),
      priceRange: priceRange[0] || {
        minPrice: 0,
        maxPrice: 0,
        totalStock: 0,
        productCount: 0
      }
    });
  })
);

router.get(
  '/mine',
  protect,
  allowRoles('farmer'),
  asyncHandler(async (req, res) => {
    const products = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ products: products.map(presentProduct) });
  })
);

router.post(
  '/',
  protect,
  allowRoles('farmer'),
  requireVerifiedFarmer,
  requireActiveSubscription,
  upload.single('image'),
  [
    body('name').trim().notEmpty().withMessage('Product name is required.'),
    body('category').trim().notEmpty().withMessage('Category is required.'),
    body('description').trim().isLength({ min: 10 }).withMessage('Add a short product description.'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be valid.'),
    body('unit').trim().notEmpty().withMessage('Unit is required.'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be valid.'),
    body('location').trim().notEmpty().withMessage('Location is required.')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const product = await Product.create({
      farmer: req.user._id,
      name: req.body.name,
      category: normalizeCategory(req.body.category),
      description: req.body.description,
      price: Number(req.body.price),
      unit: req.body.unit,
      stock: Number(req.body.stock),
      location: req.body.location,
      imageUrl: resolveImageUrl(req),
      isActive: req.body.isActive !== 'false'
    });

    return res.status(201).json({ product });
  })
);

router.put(
  '/:id',
  protect,
  allowRoles('farmer'),
  upload.single('image'),
  [
    body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty.'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty.'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10 })
      .withMessage('Add a short product description.'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be valid.'),
    body('unit').optional().trim().notEmpty().withMessage('Unit cannot be empty.'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be valid.'),
    body('location').optional().trim().notEmpty().withMessage('Location cannot be empty.'),
    body('isActive').optional().isBoolean().withMessage('Product visibility must be true or false.')
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, farmer: req.user._id });

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const editableFields = ['name', 'category', 'description', 'unit', 'location'];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = field === 'category' ? normalizeCategory(req.body[field]) : req.body[field];
      }
    });

    if (req.body.price !== undefined) {
      product.price = Number(req.body.price);
    }

    if (req.body.stock !== undefined) {
      product.stock = Number(req.body.stock);
    }

    if (req.body.isActive !== undefined) {
      product.isActive = req.body.isActive === true || req.body.isActive === 'true';
    }

    const imageUrl = resolveImageUrl(req);
    if (imageUrl) {
      product.imageUrl = imageUrl;
    }

    await product.save();
    return res.json({ product });
  })
);

router.delete(
  '/:id',
  protect,
  allowRoles('farmer'),
  asyncHandler(async (req, res) => {
    const product = await Product.findOneAndDelete({ _id: req.params.id, farmer: req.user._id });

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json({ message: 'Product removed.' });
  })
);

export default router;
