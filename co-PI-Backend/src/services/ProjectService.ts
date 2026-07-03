import { PrismaClient, Project } from '@prisma/client';

import { prisma } from '../db';

export class ProjectService {
  /**
   * Creates a new project and automatically assigns the creator as the Principal Investigator (PI).
   */
  static async createProject(userId: string, title: string, description: string, researchTopic: string): Promise<Project> {
    // Inherit the PI's university so discovery scoping works
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { university: true },
    });

    const project = await prisma.project.create({
      data: {
        title,
        description,
        researchTopic,
        university: creator?.university ?? null,
        visibility: 'PUBLIC',          // default public so discovery works
        members: {
          create: {
            userId,
            role: 'PI',
          },
        },
      },
    });

    return project;
  }

  /**
   * Fetches all projects that a specific user is a member of.
   */
  static async getProjectsForUser(userId: string): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    return projects;
  }

  /**
   * Fetches a single project by its ID, including its members.
   */
  static async getProjectById(projectId: string): Promise<Project | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
            assigner: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        proposal: true,
      },
    });

    return project;
  }

  /**
   * Adds a new member to an existing project.
   */
  static async addProjectMember(projectId: string, targetUserId: string, role: string) {
    // Prevent duplicate members
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (existingMember) {
      throw { statusCode: 409, message: 'User is already a member of this project.' };
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUserId,
        role,
      },
    });

    return member;
  }

  /**
   * Updates the general status of a project.
   */
  static async updateProjectStatus(projectId: string, status: any): Promise<Project> {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { status: status },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
            assigner: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        proposal: true,
      },
    });

    return project;
  }

  /**
   * Removes a member from a project.
   */
  static async removeProjectMember(projectId: string, targetUserId: string) {
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!existingMember) {
      throw { statusCode: 404, message: 'User is not a member of this project.' };
    }

    if (existingMember.role === 'PI') {
      // Typically we don't allow removing the main PI unless there's another PI, 
      // but for simplicity, we'll just throw an error.
      const pis = await prisma.projectMember.count({
        where: { projectId, role: 'PI' },
      });
      if (pis <= 1) {
        throw { statusCode: 400, message: 'Cannot remove the only Principal Investigator from the project.' };
      }
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    return { success: true };
  }
}
