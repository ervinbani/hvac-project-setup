const ProductCategory = require("../models/ProductCategory");
const Product = require("../models/Product");

// GET /api/product-categories
const listProductCategories = async (req, res, next) => {
  try {
    const MAX_LIMIT = 100;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit) || 20),
    );
    const skip = (page - 1) * limit;

    const filter = { tenantId: req.user.tenantId };
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const [categories, total] = await Promise.all([
      ProductCategory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ProductCategory.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: categories,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/product-categories/:id
const getProductCategory = async (req, res, next) => {
  try {
    const category = await ProductCategory.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, error: "Product category not found" });
    }

    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// POST /api/product-categories
const createProductCategory = async (req, res, next) => {
  try {
    const { name, description, color, isActive } = req.body;

    if (!name || !name.en || !name.es) {
      return res.status(400).json({
        success: false,
        error:
          "Category name is required in both English (name.en) and Spanish (name.es)",
      });
    }

    const category = await ProductCategory.create({
      tenantId: req.user.tenantId,
      name,
      description,
      color,
      isActive,
    });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// PUT /api/product-categories/:id
const updateProductCategory = async (req, res, next) => {
  try {
    const allowedFields = ["name", "description", "color", "isActive"];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.name && (!updates.name.en || !updates.name.es)) {
      return res.status(400).json({
        success: false,
        error:
          "Category name must include both English (name.en) and Spanish (name.es)",
      });
    }

    const category = await ProductCategory.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!category) {
      return res
        .status(404)
        .json({ success: false, error: "Product category not found" });
    }

    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/product-categories/:id
const deleteProductCategory = async (req, res, next) => {
  try {
    // Prevent deletion if any products reference this category
    const productCount = await Product.countDocuments({
      categoryId: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (productCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete category: ${productCount} product(s) are assigned to it`,
      });
    }

    const category = await ProductCategory.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, error: "Product category not found" });
    }

    res.json({ success: true, data: { message: "Product category deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listProductCategories,
  getProductCategory,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
};
