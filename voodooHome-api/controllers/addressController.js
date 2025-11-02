const Address = require('../models/Address');

// @desc    Get all addresses for current user
// @route   GET /voodoo/api/addresses
// @access  Private
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id });
    res.json({ success: true, data: addresses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single address
// @route   GET /voodoo/api/addresses/:id
// @access  Private
exports.getAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address || String(address.user) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.json({ success: true, data: address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new address
// @route   POST /voodoo/api/addresses
// @access  Private
exports.createAddress = async (req, res) => {
  try {
    const data = { ...req.body, user: req.user.id };
    const created = await Address.create(data);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update address
// @route   PUT /voodoo/api/addresses/:id
// @access  Private
exports.updateAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address || String(address.user) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Address not found' });
    }
    const updated = await Address.findByIdAndUpdate(address.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete address
// @route   DELETE /voodoo/api/addresses/:id
// @access  Private
exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address || String(address.user) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Address not found' });
    }
    await address.remove();
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Set default address
// @route   PATCH /voodoo/api/addresses/:id/default
// @access  Private
exports.setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address || String(address.user) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Address not found' });
    }
    const updated = await Address.setDefault(req.user.id, address.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};