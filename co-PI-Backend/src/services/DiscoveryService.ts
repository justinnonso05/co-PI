import { PrismaClient, Project, ProjectApplication } from '@prisma/client';
import { prisma } from '../db';

export class DiscoveryService {
  /**
   * Unauthenticated search returning only aggregate counts.
   * Does not expose PII or project details.
   */
  static async searchPublicProjectsCount(keyword: string): Promise<number> {
    const count = await prisma.project.count({
      where: {
        visibility: 'PUBLIC',
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { researchTopic: { contains: keyword, mode: 'insensitive' } }
        ]
      },
    });
    return count;
  }

  /**
   * Authenticated search scoped strictly to the user's university.
   * Returns limited project details.
   */
  static async getUniversityProjects(university: string, userId: string): Promise<Partial<Project>[]> {
    const projects = await prisma.project.findMany({
      where: {
        visibility: 'PUBLIC',
        university: university,
        status: { not: 'ARCHIVED' }
      },
      select: {
        id: true,
        title: true,
        researchTopic: true,
        description: true,
        status: true,
        createdAt: true,
        members: {
          where: { role: 'PI' },
          select: {
            user: {
              select: { firstName: true, lastName: true, faculty: true }
            }
          }
        },
        applications: {
          where: { userId, status: 'PENDING' },
          select: { id: true, status: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return projects;
  }

  /**
   * Apply to collaborate on a project.
   */
  static async applyToProject(projectId: string, userId: string, role: string): Promise<ProjectApplication> {
    // Ensure the project belongs to the user's university
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!user || !project) {
      throw { statusCode: 404, message: 'Not found' };
    }

    if (user.university !== project.university) {
      throw { statusCode: 403, message: 'You can only apply to projects within your university.' };
    }

    const application = await prisma.projectApplication.create({
      data: {
        projectId,
        userId,
        role,
        status: 'PENDING'
      }
    });

    return application;
  }
}
