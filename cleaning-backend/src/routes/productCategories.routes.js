const express = require("express");
const router = express.Router();
const {
  listProductCategories,
  getProductCategory,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} = require("../controllers/productCategories.controller");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

router.use(auth);

router.get("/", authorize("productCategories.read"), listProductCategories);
router.get("/:id", authorize("productCategories.read"), getProductCategory);
router.post("/", authorize("productCategories.create"), createProductCategory);
router.put("/:id", authorize("productCategories.update"), updateProductCategory);
router.delete("/:id", authorize("productCategories.delete"), deleteProductCategory);

module.exports = router;
