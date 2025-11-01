const { body, param, query } = require('express-validator');

// Auth validation rules
const authValidation = {
  register: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name is required and must be less than 100 characters'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('dob')
      .isISO8601()
      .withMessage('Please provide a valid date of birth')
      .custom((value) => {
        if (new Date(value) >= new Date()) {
          throw new Error('Date of birth must be in the past');
        }
        return true;
      }),
    body('phoneNumber')
      .matches(/^[\+]?[0-9]{9,12}$/)
      .withMessage('Phone number must be 9 to 12 digits'),
    body('gender')
      .isIn(['Male', 'Female', 'Others'])
      .withMessage('Gender must be one of: Male, Female, Others'),
    body('role')
      .optional()
      .isIn(['Manager', 'Stock Clerk', 'Customer'])
      .withMessage('Role must be one of: Manager, Stock Clerk, Customer')
  ],

  login: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('phoneNumber')
      .optional()
      .matches(/^[\+]?[0-9]{9,12}$/)
      .withMessage('Phone number must be 9 to 12 digits'),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar must be a valid URL')
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
  ]
};

// Customer validation rules
const customerValidation = {
  updateProfile: [
    body('addresses')
      .optional()
      .isArray()
      .withMessage('Addresses must be an array'),
    body('addresses.*')
      .optional()
      .isMongoId()
      .withMessage('Each address must be a valid ObjectId')
  ],

  updateLoyaltyPoints: [
    body('points')
      .isNumeric()
      .withMessage('Points must be a number')
      .custom((value) => {
        if (value < 0) {
          throw new Error('Points cannot be negative');
        }
        return true;
      }),
    body('operation')
      .optional()
      .isIn(['add', 'subtract', 'set'])
      .withMessage('Operation must be one of: add, subtract, set')
  ],

  addAddress: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Address name is required and must be less than 100 characters'),
    body('addressInfo')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Address info is required and must be less than 500 characters'),
    body('isDefault')
      .optional()
      .isBoolean()
      .withMessage('isDefault must be a boolean')
  ],

  updateAddress: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Address name must be less than 100 characters'),
    body('addressInfo')
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Address info must be less than 500 characters'),
    body('isDefault')
      .optional()
      .isBoolean()
      .withMessage('isDefault must be a boolean')
  ],

  getAllCustomers: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('Status must be either active or inactive')
  ]
};

// Parameter validation rules
const paramValidation = {
  userId: [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ],

  customerId: [
    param('customerId')
      .isMongoId()
      .withMessage('Invalid customer ID')
  ],

  addressId: [
    param('addressId')
      .isMongoId()
      .withMessage('Invalid address ID')
  ]
};

module.exports = {
  authValidation,
  customerValidation,
  paramValidation
};
