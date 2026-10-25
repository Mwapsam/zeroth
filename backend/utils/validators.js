const { body, validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
};

exports.registerRules = [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('phone').trim().notEmpty().withMessage('Phone required').isLength({ max: 40 })
];

exports.loginRules = [
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password required')
];

exports.contactRules = [
    body('name').trim().notEmpty(),
    body('email').trim().isEmail().normalizeEmail(),
    body('message').trim().isLength({ min: 5, max: 2000 })
];

exports.applicationRules = [
    body('applicantName').trim().notEmpty(),
    body('applicantEmail').trim().isEmail().normalizeEmail(),
    body('applicantPhone').trim().notEmpty()
];