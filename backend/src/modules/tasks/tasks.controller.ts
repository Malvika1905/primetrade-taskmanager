import { Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { AppError } from '../../utils/errors';

export const getTasks = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, priority, search, userId } = req.query;

    const whereClause: any = {};

    // Role check and filter
    if (req.user.role === 'ADMIN') {
      if (userId) {
        whereClause.userId = userId;
      }
    } else {
      whereClause.userId = req.user.id;
    }

    // Query parameters filtering
    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    if (!task) {
      next(new AppError('Task not found', 404));
      return;
    }

    // Access control: admins can view any task, users can only view their own tasks
    if (req.user.role !== 'ADMIN' && task.userId !== req.user.id) {
      next(new AppError('Access denied: You do not own this task', 403));
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      next(new AppError('Task not found', 404));
      return;
    }

    // Access control
    if (req.user.role !== 'ADMIN' && task.userId !== req.user.id) {
      next(new AppError('Access denied: You do not own this task', 403));
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title : task.title,
        description: description !== undefined ? description : task.description,
        status: status !== undefined ? status : task.status,
        priority: priority !== undefined ? priority : task.priority,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : task.dueDate,
      },
    });

    res.status(200).json({
      status: 'success',
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      next(new AppError('Task not found', 404));
      return;
    }

    // Access control
    if (req.user.role !== 'ADMIN' && task.userId !== req.user.id) {
      next(new AppError('Access denied: You do not own this task', 403));
      return;
    }

    await prisma.task.delete({ where: { id } });

    res.status(200).json({
      status: 'success',
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
