const express = require('express');
const router = express.Router();
const { listRoles, getRole, createRole, updateRole, deleteRole } = require('../controllers/roles.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(auth);

router.get('/', authorize('roles.read'), listRoles);
router.get('/:id', authorize('roles.read'), getRole);
router.post('/', authorize('roles.create'), createRole);
router.put('/:id', authorize('roles.update'), updateRole);
router.delete('/:id', authorize('roles.delete'), deleteRole);

module.exports = router;
