const Customer = require('../models/Customer');
const Job = require('../models/Job');
const Invoice = require('../models/Invoice');

// GET /api/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const now = new Date();

    // Today boundaries
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // This week boundaries (Monday to Sunday)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay(); // 0 = Sunday
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // This month boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalCustomers,
      jobsToday,
      jobsThisWeek,
      revenueMonthResult,
      pendingInvoices,
      recentJobs,
      jobsByStatus,
    ] = await Promise.all([
      Customer.countDocuments({ tenantId, status: 'active' }),

      Job.countDocuments({
        tenantId,
        scheduledStart: { $gte: todayStart, $lte: todayEnd },
        status: { $nin: ['canceled'] },
      }),

      Job.countDocuments({
        tenantId,
        scheduledStart: { $gte: weekStart, $lte: weekEnd },
        status: { $nin: ['canceled'] },
      }),

      Invoice.aggregate([
        {
          $match: {
            tenantId: tenantId,
            status: 'paid',
            paidAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),

      Invoice.countDocuments({
        tenantId,
        status: { $in: ['sent', 'overdue'] },
      }),

      Job.find({
        tenantId,
        scheduledStart: { $gte: todayStart, $lte: todayEnd },
        status: { $nin: ['canceled'] },
      })
        .populate('customerId', 'firstName lastName phone')
        .populate('serviceId', 'name')
        .sort({ scheduledStart: 1 })
        .limit(10),

      Job.aggregate([
        { $match: { tenantId: tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const revenueMonth = revenueMonthResult.length > 0 ? revenueMonthResult[0].total : 0;

    const statusBreakdown = {};
    for (const item of jobsByStatus) {
      statusBreakdown[item._id] = item.count;
    }

    res.json({
      success: true,
      data: {
        totalCustomers,
        jobsToday,
        jobsThisWeek,
        revenueMonth,
        pendingInvoices,
        recentJobsToday: recentJobs,
        jobsByStatus: statusBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
