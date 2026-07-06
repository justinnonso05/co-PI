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
   * Authenticated or Unauthenticated search for discovering public repositories.
   * Returns paginated repository details.
   */
  static async getPublicRepositories(
    userId: string | null,
    page: number = 1,
    limit: number = 40,
    search: string = ''
  ): Promise<{ data: Partial<Project>[], total: number, page: number, totalPages: number }> {
    const whereClause: any = {
      visibility: 'PUBLIC',
      status: { not: 'ARCHIVED' }
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { researchTopic: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [total, repositories] = await Promise.all([
      prisma.project.count({ where: whereClause }),
      prisma.project.findMany({
        where: whereClause,
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
          ...(userId ? {
            applications: {
              where: { userId, status: 'PENDING' },
              select: { id: true, status: true, role: true }
            }
          } : {})
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      data: repositories,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
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
