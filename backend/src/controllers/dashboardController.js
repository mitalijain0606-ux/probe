const statsService = require('../services/statsService');

async function getStats(req, res, next) {
  try {
    const stats = await statsService.getDashboardStats(req.user.id);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
};
