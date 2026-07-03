import { PrismaClient, Task } from '@prisma/client';

import { prisma } from '../db';

export class TaskService {
  /**
   * Creates a new task within a project.
   */
  static async createTask(projectId: string, title: string, dueDate: Date, assignedUserId?: string, assignedByUserId?: string): Promise<Task> {
    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        dueDate,
        assignedUserId,
        assignedByUserId,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        assigner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return task;
  }

  /**
   * Fetches all tasks for a specific project.
   */
  static async getTasksForProject(projectId: string): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assigner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return tasks;
  }

  /**
   * Updates the completion status of a task.
   */
  static async updateTaskStatus(taskId: string, isCompleted: boolean): Promise<Task> {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { isCompleted },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        assigner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return task;
  }

  /**
   * Fetches a specific task to verify existence and its parent project.
   */
  static async getTaskById(taskId: string): Promise<Task | null> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    return task;
  }
}
