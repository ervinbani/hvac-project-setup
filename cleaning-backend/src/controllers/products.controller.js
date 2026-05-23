const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");

const VALID_UNITS = ["piece", "box", "liter", "kg", "gallon", "pack", "other"];

// GET /api/products
const listProducts = async (req, res, next) => {
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

    if (req.query.categoryId) {
      filter.categoryId = String(req.query.categoryId);
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("categoryId", "name color")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    }).populate("categoryId", "name color");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const {
      categoryId,
      name,
      description,
      sku,
      barcode,
      unit,
      unitPrice,
      cost,
      stock,
      taxable,
      isActive,
    } = req.body;

    if (!name || !name.en || !name.es) {
      return res.status(400).json({
        success: false,
        error:
          "Product name is required in both English (name.en) and Spanish (name.es)",
      });
    }

    if (unit !== undefined && !VALID_UNITS.includes(unit)) {
      return res.status(400).json({
        success: false,
        error: `unit must be one of: ${VALID_UNITS.join(", ")}`,
      });
    }

    // Verify categoryId belongs to this tenant (if provided)
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid categoryId" });
      }
      const category = await ProductCategory.findOne({
        _id: categoryId,
        tenantId: req.user.tenantId,
      });
      if (!category) {
        return res
          .status(400)
          .json({ success: false, error: "Product category not found" });
      }
    }

    const product = await Product.create({
      tenantId: req.user.tenantId,
      categoryId: categoryId || null,
      name,
      description,
      sku,
      barcode,
      unit,
      unitPrice,
      cost,
      stock,
      taxable,
      isActive,
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "A product with this SKU already exists",
      });
    }
    next(err);
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const allowedFields = [
      "categoryId",
      "name",
      "description",
      "sku",
      "barcode",
      "unit",
      "unitPrice",
      "cost",
      "stock",
      "taxable",
      "isActive",
    ];
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
          "Product name must include both English (name.en) and Spanish (name.es)",
      });
    }

    if (updates.unit !== undefined && !VALID_UNITS.includes(updates.unit)) {
      return res.status(400).json({
        success: false,
        error: `unit must be one of: ${VALID_UNITS.join(", ")}`,
      });
    }

    // Verify categoryId belongs to this tenant (if being changed)
    if (updates.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(updates.categoryId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid categoryId" });
      }
      const category = await ProductCategory.findOne({
        _id: updates.categoryId,
        tenantId: req.user.tenantId,
      });
      if (!category) {
        return res
          .status(400)
          .json({ success: false, error: "Product category not found" });
      }
    }

    // Allow explicitly unsetting the category
    if (req.body.categoryId === null) {
      updates.categoryId = null;
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true },
    ).populate("categoryId", "name color");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "A product with this SKU already exists",
      });
    }
    next(err);
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, data: { message: "Product deleted" } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
