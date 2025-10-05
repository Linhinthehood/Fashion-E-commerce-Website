const Customer = require('../models/Customer');
const User = require('../models/User');
const Address = require('../models/Address');

// Get customer profile
const getCustomerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const customer = await Customer.findByUserId(userId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        customer
      }
    });
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update customer profile
const updateCustomerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addresses } = req.body;

    const updateData = {};
    if (addresses !== undefined) updateData.addresses = addresses;

    const customer = await Customer.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer profile updated successfully',
      data: {
        customer
      }
    });
  } catch (error) {
    console.error('Update customer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update loyalty points
const updateLoyaltyPoints = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { points, operation = 'add' } = req.body; // operation: 'add', 'subtract', 'set'

    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    let newPoints;
    switch (operation) {
      case 'add':
        newPoints = customer.loyaltyPoints + points;
        break;
      case 'subtract':
        newPoints = Math.max(0, customer.loyaltyPoints - points);
        break;
      case 'set':
        newPoints = Math.max(0, points);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation. Must be: add, subtract, or set'
        });
    }

    customer.loyaltyPoints = newPoints;
    await customer.save();

    res.json({
      success: true,
      message: 'Loyalty points updated successfully',
      data: {
        customer: customer.toJSON()
      }
    });
  } catch (error) {
    console.error('Update loyalty points error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all customers (Admin/Manager only)
const getAllCustomers = async (req, res) => {
  try {

    const { page = 1, limit = 10, city, district, status } = req.query;
    const filter = {};
    
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (district) filter['address.district'] = new RegExp(district, 'i');
    if (status) filter.isActive = status === 'active';

    const customers = await Customer.findWithUserDetails(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Customer.countDocuments(filter);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get customer by ID (Admin/Manager only)
const getCustomerById = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId).populate('userId', 'name email phoneNumber gender dob avatar status');
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: {
        customer
      }
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add new address to customer
const addAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, addressInfo, isDefault } = req.body;

    // Create new address
    const address = new Address({
      name,
      addressInfo,
      isDefault: isDefault || false
    });
    await address.save();

    // Add address to customer
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await Address.updateMany(
        { _id: { $in: customer.addresses } },
        { $set: { isDefault: false } }
      );
    }

    customer.addresses.push(address._id);
    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: {
        address,
        customer: customer.toJSON()
      }
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;
    const { name, addressInfo, isDefault } = req.body;

    // Find customer and verify ownership
    const customer = await Customer.findOne({ userId });
    if (!customer || !customer.addresses.includes(addressId)) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or access denied'
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await Address.updateMany(
        { _id: { $in: customer.addresses } },
        { $set: { isDefault: false } }
      );
    }

    // Update address
    const address = await Address.findByIdAndUpdate(
      addressId,
      { name, addressInfo, isDefault },
      { new: true, runValidators: true }
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: {
        address
      }
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    // Find customer and verify ownership
    const customer = await Customer.findOne({ userId });
    if (!customer || !customer.addresses.includes(addressId)) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or access denied'
      });
    }

    // Remove address from customer's addresses array
    customer.addresses = customer.addresses.filter(addr => addr.toString() !== addressId);
    await customer.save();

    // Delete the address
    await Address.findByIdAndDelete(addressId);

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  updateLoyaltyPoints,
  getAllCustomers,
  getCustomerById,
  addAddress,
  updateAddress,
  deleteAddress
};
