const express = require('express');
const router = express.Router();
const {
  listJobs,
  getJob,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
} = require('../controllers/jobs.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const ADMIN       = ['owner', 'director', 'manager_operations', 'manager_hr'];
const ADMIN_STAFF = [...ADMIN, 'staff'];
const ALL_ROLES   = [...ADMIN_STAFF, 'worker'];

router.use(auth);

router.get('/', listJobs);
router.get('/:id', getJob);
router.post('/', requireRole(...ADMIN_STAFF), createJob);
router.put('/:id', requireRole(...ADMIN_STAFF), updateJob);
router.patch('/:id/status', requireRole(...ALL_ROLES), updateJobStatus);
router.delete('/:id', requireRole(...ADMIN), deleteJob);

module.exports = router;
