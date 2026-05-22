import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { AppError } from '../../utils/errors';

export const getMe = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      next(new AppError('User details not found in request context', 401));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      next(new AppError('User not found', 404));
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      next(new AppError('User not found', 404));
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'User role updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};
