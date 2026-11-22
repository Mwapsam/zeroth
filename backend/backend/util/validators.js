/* ============================================================
   VALIDATORS — utils/validators.js
   ------------------------------------------------------------
   v2 changes:
     • `validate()` now returns errors keyed by field (frontend
       reads them by name) AND as a flat array (for logs).
     • `registerRules` no longer requires `phone` — many signup
       forms omit it, and the model has a default.
     • `applicationRules` now accepts the frontend's flat shape
       (firstName + surname) — validates EITHER applicantName
       OR firstName+surname.
     • Added rules for:
         – changePasswordRules
         – updateProfileRules
         – rentApplicationRules
         – shopRules + productRules (market)
         – listingRules (agriculture + hardware)
         – permitRules (animal acquisition)
     • `optionalString` / `optionalNumber` helpers.
     • All string fields get max-length caps to prevent 10 MB
       payload injection attempts.
   ============================================================ */

'use strict';

const { body, validationResult, param, query } = require('express-validator');

/* ============================================================
   VALIDATE MIDDLEWARE
   ============================================================ */
exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    const array = errors.array();

    /* Group errors by field — frontend uses this shape */
    const byField = {};
    for (const e of array) {
        if (!byField[e.path]) byField[e.path] = [];
        byField[e.path].push(e.msg);
    }

    return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: array.map((e) => ({ field: e.path, message: e.msg })),
        fields: byField
    });
};

/* ============================================================
   SHORTHAND HELPERS
   ============================================================ */
const optionalString = (field, max = 500) =>
    body(field)
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .isLength({ max })
        .withMessage(`${field} must be ≤ ${max} characters`);

const optionalNumber = (field) =>
    body(field)
        .optional({ nullable: true, checkFalsy: true })
        .isNumeric()
        .withMessage(`${field} must be a number`);

const isObjectId = (field) =>
    body(field)
        .optional({ nullable: true })
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage(`${field} must be a valid ObjectId`);

/* ============================================================
   AUTH
   ============================================================ */
exports.registerRules = [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6, max: 128 }).withMessage('Password must be 6–128 chars'),
    optionalString('phone', 40),
    optionalString('country', 60)
];

exports.loginRules = [
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password required')
];

exports.changePasswordRules = [
    body('currentPassword').notEmpty().withMessage('currentPassword is required'),
    body('newPassword')
        .isLength({ min: 6, max: 128 })
        .withMessage('newPassword must be 6–128 chars')
];

exports.updateProfileRules = [
    optionalString('name', 120),
    optionalString('phone', 40),
    optionalString('country', 60),
    optionalString('avatar', 400),
    optionalString('bio', 500)
];

/* ============================================================
   CONTACT
   ============================================================ */
exports.contactRules = [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('subject').optional().trim().isLength({ max: 200 }),
    body('message')
        .trim()
        .isLength({ min: 5, max: 2000 })
        .withMessage('Message must be 5–2000 chars')
];

/* ============================================================
   APPLICATION (loans, shares, rentals, partner, tutor)
   ============================================================ */
exports.applicationRules = [
    // Must be one of the supported types
    body('type')
        .optional()
        .isIn([
            'loan', 'share', 'education', 'rental',
            'partner', 'become-partner', 'tutor', 'other'
        ])
        .withMessage('Unknown application type'),

    // Either applicantName OR firstName+surname
    body('applicantName')
        .if((v, { req }) => !req.body?.firstName || !req.body?.surname)
        .trim()
        .notEmpty()
        .withMessage('applicantName (or firstName + surname) is required')
        .isLength({ max: 120 }),

    // Either applicantEmail OR email
    body('applicantEmail')
        .if((v, { req }) => !req.body?.email)
        .trim()
        .isEmail()
        .withMessage('applicantEmail (or email) is required')
        .normalizeEmail(),

    body('email').optional().trim().isEmail().normalizeEmail(),

    // Either applicantPhone OR phone
    body('applicantPhone')
        .if((v, { req }) => !req.body?.phone)
        .trim()
        .notEmpty()
        .withMessage('applicantPhone (or phone) is required')
        .isLength({ max: 40 }),

    optionalString('phone', 40),
    optionalString('notes', 2000)
];

/* ============================================================
   RENTAL APPLICATIONS
   ============================================================ */
exports.rentalApplicationRules = [
    body('fullName').trim().notEmpty().isLength({ max: 120 }),
    body('phone').trim().notEmpty().isLength({ max: 40 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('idNumber').trim().notEmpty().isLength({ max: 60 }),
    body('employment').optional().trim().isLength({ max: 60 }),
    body('employer').optional().trim().isLength({ max: 120 }),
    body('income').optional().isNumeric(),
    body('moveIn').optional().isISO8601(),
    body('occupants').optional().isInt({ min: 1, max: 50 }),
    optionalString('pets', 80),
    optionalString('refName', 120),
    optionalString('refPhone', 40),
    optionalString('message', 500)
];

/* ============================================================
   MARKET / SHOPS
   ============================================================ */
exports.shopRules = [
    body('name').trim().notEmpty().isLength({ max: 120 }),
    body('category').trim().notEmpty().isLength({ max: 80 }),
    body('address').optional().trim().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    optionalNumber('lat'),
    optionalNumber('lng')
];

exports.productRules = [
    body('shopId').optional().matches(/^[0-9a-fA-F]{24}$/),
    body('name').trim().notEmpty().isLength({ max: 120 }),
    optionalString('category', 80),
    body('price').isNumeric().withMessage('price must be a number'),
    body('stock').optional().isInt({ min: 0 }),
    optionalString('unit', 20),
    optionalString('description', 1000)
];

/* ============================================================
   AGRICULTURE / HARDWARE LISTINGS
   ============================================================ */
exports.listingRules = [
    body('name').trim().notEmpty().isLength({ max: 200 }),
    body('category').trim().notEmpty().isLength({ max: 80 }),
    body('price').isNumeric().withMessage('price must be numeric'),
    body('qty').optional().isInt({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
    optionalString('desc', 2000),
    optionalString('description', 2000),
    optionalString('unit', 20),
    optionalString('region', 80),
    optionalString('city', 80),
    optionalString('seller', 120),
    optionalString('phone', 40),
    optionalNumber('lat'),
    optionalNumber('lng'),
    optionalString('image', 400)
];

/* ============================================================
   ANIMAL PERMIT
   ============================================================ */
exports.permitRules = [
    body('from').trim().notEmpty().withMessage('Origin (from) is required').isLength({ max: 200 }),
    body('to').trim().notEmpty().withMessage('Destination (to) is required').isLength({ max: 200 }),
    body('zbsRep').trim().notEmpty().withMessage('ZBS Rep name is required').isLength({ max: 120 }),
    body('sellers').isArray({ min: 1 }).withMessage('At least one seller row is required'),
    body('sellers.*.name').trim().notEmpty().isLength({ max: 120 }),
    body('sellers.*.nrc').trim().notEmpty().isLength({ max: 60 }),
    body('sellers.*.phone').trim().notEmpty().isLength({ max: 40 }),
    body('sellers.*.animalDesc').trim().notEmpty().isLength({ max: 200 }),
    body('sellers.*.village').trim().notEmpty().isLength({ max: 80 }),
    body('sellers.*.district').trim().notEmpty().isLength({ max: 80 }),
    body('sellers.*.province').trim().notEmpty().isLength({ max: 80 })
];

/* ============================================================
   QUERY PARAM HELPERS
   ============================================================ */
exports.paginationQuery = [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
];

exports.objectIdParam = (name = 'id') =>
    param(name).matches(/^[0-9a-fA-F]{24}$/).withMessage(`${name} must be a valid ObjectId`);

/* ============================================================
   EXPORTS FOR CONVENIENCE
   ============================================================ */
exports.optionalString = optionalString;
exports.optionalNumber = optionalNumber;
exports.isObjectId = isObjectId;