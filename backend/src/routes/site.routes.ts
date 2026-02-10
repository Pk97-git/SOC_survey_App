import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { SiteController } from '../controllers/site.controller';

const router = Router();
const siteController = new SiteController();

// Get all sites (Any authenticated user)
router.get('/', authenticate, siteController.getAll);

// Get site by ID
router.get('/:id', authenticate, siteController.getById);

// Create site (Admin only)
router.post('/', authenticate, authorize('admin'), siteController.create);

// Update site (Admin only)
router.put('/:id', authenticate, authorize('admin'), siteController.update);

// Delete site (Admin only)
router.delete('/:id', authenticate, authorize('admin'), siteController.delete);

export default router;
