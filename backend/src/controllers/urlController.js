const urlService = require('../services/urlService');

async function getUrls(req, res, next) {
  try {
    const urls = await urlService.getUserUrls(req.user.id);
    return res.status(200).json({
      success: true,
      data: urls,
    });
  } catch (err) {
    next(err);
  }
}

async function createUrl(req, res, next) {
  try {
    const newUrl = await urlService.createMonitoredUrl(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'URL added to monitoring list',
      data: newUrl,
    });
  } catch (err) {
    next(err);
  }
}

async function getUrlById(req, res, next) {
  try {
    const url = await urlService.getUrlById(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      data: url,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteUrl(req, res, next) {
  try {
    const result = await urlService.deleteMonitoredUrl(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (err) {
    next(err);
  }
}

async function manualCheck(req, res, next) {
  try {
    const result = await urlService.manualCheckUrl(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Health check completed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getUrlHistory(req, res, next) {
  try {
    const limit = req.query.limit || 50;
    const history = await urlService.getUrlHistory(req.user.id, req.params.id, limit);
    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
}

async function importUrls(req, res, next) {
  try {
    let payload = req.body;
    // If sent as an object with a "urls" key
    if (payload && payload.urls && Array.isArray(payload.urls)) {
      payload = payload.urls;
    }

    const result = await urlService.importUrlsFromJson(req.user.id, payload);
    return res.status(200).json({
      success: true,
      message: `Import completed: ${result.importedCount} added, ${result.failedCount} failed`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUrls,
  createUrl,
  getUrlById,
  deleteUrl,
  manualCheck,
  getUrlHistory,
  importUrls,
};
