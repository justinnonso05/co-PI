import { PrismaClient, ResearchOutput } from '@prisma/client';

import { prisma } from '../db';

export class OutputService {
  /**
   * Logs a new research output.
   */
  static async createOutput(projectId: string, outputType: string, citation: string, fileUrl?: string): Promise<ResearchOutput> {
    const output = await prisma.researchOutput.create({
      data: {
        projectId,
        outputType,
        citation,
        fileUrl,
      },
    });

    return output;
  }

  /**
   * Fetches all research outputs for a specific project.
   */
  static async getOutputsForProject(projectId: string): Promise<ResearchOutput[]> {
    const outputs = await prisma.researchOutput.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return outputs;
  }
}
