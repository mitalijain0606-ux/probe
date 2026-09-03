import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../../middleware/auth.middleware.js';
import * as urlController from '../controller/url.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', urlController.list);
router.post('/', urlController.create);
router.post('/bulk', urlController.bulkCreate);
router.get('/admin/all', requireAdmin, urlController.listAllForAdmin);
router.get('/:id', urlController.getOne);
router.delete('/:id', urlController.remove);
router.post('/:id/check', urlController.triggerCheck);
router.get('/:id/history', urlController.history);

export default router;
