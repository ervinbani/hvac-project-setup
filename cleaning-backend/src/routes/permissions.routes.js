const express = require('express');
const router = express.Router();
const { listPermissions } = require('../controllers/permissions.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(auth);

router.get('/', authorize('permissions.read'), listPermissions);

module.exports = router;
