import { PrismaClient, Survey, SurveyResponse } from '@prisma/client';

import { prisma } from '../db';

export class SurveyService {
  /**
   * Defines a new survey schema for a project.
   */
  static async createSurvey(projectId: string, title: string, schemaJson: any): Promise<Survey> {
    const survey = await prisma.survey.create({
      data: {
        projectId,
        title,
        schemaJson,
      },
    });

    return survey;
  }

  /**
   * Fetches all surveys defined for a specific project.
   */
  static async getSurveysForProject(projectId: string): Promise<Survey[]> {
    const surveys = await prisma.survey.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return surveys;
  }

  /**
   * Fetches a specific survey to verify its existence and parent project.
   */
  static async getSurveyById(surveyId: string): Promise<Survey | null> {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
    });

    return survey;
  }

  /**
   * Submits a new response (answers) to a survey.
   */
  static async submitSurveyResponse(surveyId: string, answers: any, submittedBy?: string): Promise<SurveyResponse> {
    const response = await prisma.surveyResponse.create({
      data: {
        surveyId,
        answers,
        submittedBy,
      },
    });

    return response;
  }

  /**
   * Fetches all responses submitted for a specific survey.
   */
  static async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      orderBy: { createdAt: 'desc' },
    });

    return responses;
  }
}
