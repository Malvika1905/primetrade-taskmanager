import { Router } from 'express';
import { getMe, getAllUsers, updateUserRole } from './users.controller';
import { updateRoleSchema } from './users.validation';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/me', getMe);

// Admin-only routes
router.get('/', authorize(['ADMIN']), getAllUsers);
router.patch('/:id/role', authorize(['ADMIN']), validate(updateRoleSchema), updateUserRole);

export default router;
