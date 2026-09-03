import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../../middleware/auth.middleware.js';
import * as reportController from '../controller/report.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', reportController.summary);
router.get('/metrics', requireAdmin, reportController.metrics);
router.get('/admin/overview', requireAdmin, reportController.adminOverview);

export default router;
