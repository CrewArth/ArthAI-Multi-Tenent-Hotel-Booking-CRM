export const listTaxes = async (req, res) => {
  try {
    const { Tax } = req.tenantModels;
    const taxes = await Tax.find().sort({ createdAt: -1 });
    return res.json({ taxes });
  } catch (err) {
    console.error('Error listing taxes:', err);
    return res.status(500).json({ message: 'Unable to fetch taxes' });
  }
};

export const createTax = async (req, res) => {
  try {
    const { Tax } = req.tenantModels;
    const { name, percentage } = req.body;
    if (!name || percentage == null) {
      return res.status(400).json({ message: 'Name and percentage are required' });
    }

    const existing = await Tax.findOne({ name });
    if (existing) {
      return res.status(409).json({ message: 'A tax with this name already exists' });
    }

    const tax = await Tax.create({ name: String(name).trim(), percentage: Number(percentage), createdBy: req.user?._id });
    return res.status(201).json({ tax });
  } catch (err) {
    console.error('Error creating tax:', err);
    return res.status(500).json({ message: 'Unable to create tax' });
  }
};

export const updateTax = async (req, res) => {
  try {
    const { Tax } = req.tenantModels;
    const { id } = req.params;
    const { name, percentage, isActive } = req.body;

    const tax = await Tax.findById(id);
    if (!tax) return res.status(404).json({ message: 'Tax not found' });

    if (name != null) tax.name = String(name).trim();
    if (percentage != null) tax.percentage = Number(percentage);
    if (isActive != null) tax.isActive = Boolean(isActive);

    await tax.save();
    return res.json({ tax });
  } catch (err) {
    console.error('Error updating tax:', err);
    return res.status(500).json({ message: 'Unable to update tax' });
  }
};

export const deleteTax = async (req, res) => {
  try {
    const { Tax } = req.tenantModels;
    const { id } = req.params;
    const tax = await Tax.findById(id);
    if (!tax) return res.status(404).json({ message: 'Tax not found' });
    tax.isActive = false;
    await tax.save();
    return res.json({ message: 'Tax disabled' });
  } catch (err) {
    console.error('Error deleting tax:', err);
    return res.status(500).json({ message: 'Unable to delete tax' });
  }
};
