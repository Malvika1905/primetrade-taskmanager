import { Router } from 'express';
import { createTask, deleteTask, getTaskById, getTasks, updateTask } from './tasks.controller';
import { createTaskSchema, taskIdSchema, updateTaskSchema } from './tasks.validation';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';

const router = Router();

// All task routes require authentication
router.use(authenticate);

router.route('/')
  .get(getTasks)
  .post(validate(createTaskSchema), createTask);

router.route('/:id')
  .get(validate(taskIdSchema), getTaskById)
  .put(validate(updateTaskSchema), updateTask)
  .delete(validate(taskIdSchema), deleteTask);

export default router;
