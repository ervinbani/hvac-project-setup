const express = require("express");
const router = express.Router();
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/products.controller");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

router.use(auth);

router.get("/", authorize("products.read"), listProducts);
router.get("/:id", authorize("products.read"), getProduct);
router.post("/", authorize("products.create"), createProduct);
router.put("/:id", authorize("products.update"), updateProduct);
router.delete("/:id", authorize("products.delete"), deleteProduct);

module.exports = router;
