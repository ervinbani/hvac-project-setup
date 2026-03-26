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

router.use(auth);

router.get('/', listJobs);
router.get('/:id', getJob);
router.post('/', requireRole('owner', 'manager', 'staff'), createJob);
router.put('/:id', requireRole('owner', 'manager', 'staff'), updateJob);
router.patch('/:id/status', requireRole('owner', 'manager', 'staff', 'cleaner'), updateJobStatus);
router.delete('/:id', requireRole('owner', 'manager'), deleteJob);

module.exports = router;
