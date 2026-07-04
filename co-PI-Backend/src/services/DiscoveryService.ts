import { PrismaClient, Project, ProjectApplication } from '@prisma/client';
import { prisma } from '../db';

export class DiscoveryService {
  /**
   * Unauthenticated search returning only aggregate counts.
   * Does not expose PII or repository details.
   */
  static async searchPublicRepositoriesCount(keyword: string): Promise<number> {
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
   * Authenticated search for discovering public repositories.
   * Returns limited repository details.
   */
  static async getPublicRepositories(userId: string): Promise<Partial<Project>[]> {
    const repositories = await prisma.project.findMany({
      where: {
        visibility: 'PUBLIC',
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
              select: { firstName: true, lastName: true }
            }
          }
        },
        applications: {
          where: { userId, status: 'PENDING' },
          select: { id: true, status: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return repositories;
  }

  /**
   * Apply to collaborate on a repository.
   */
  static async applyToRepository(repositoryId: string, userId: string, role: string): Promise<ProjectApplication> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const repository = await prisma.project.findUnique({ where: { id: repositoryId } });

    if (!user || !repository) {
      throw { statusCode: 404, message: 'Not found' };
    }

    const application = await prisma.projectApplication.create({
      data: {
        projectId: repositoryId,
        userId,
        role,
        status: 'PENDING'
      }
    });

    return application;
  }
}
