import fs from 'fs';
import path from 'path';
import { BrevoClient } from '@getbrevo/brevo';

const brevoClient = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY || 'undefined'
});

const SENDER = { name: 'CRMP', email: 'no-reply@justinch.dev' };
const REPLY_TO = { name: 'CRMP', email: 'no-reply@justinch.dev' };

export class EmailService {
  private static getTemplate(templateName: string, variables: Record<string, string>): string {
    const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    try {
      let html = fs.readFileSync(templatePath, 'utf-8');
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, value ?? '');
      }
      return html;
    } catch (error) {
      console.error(`Could not load template ${templateName}:`, error);
      return '';
    }
  }

  static async sendEmail(
    toEmail: string,
    toName: string,
    subject: string,
    templateName: string,
    variables: Record<string, string>
  ) {
    const htmlContent = this.getTemplate(templateName, variables);
    if (!htmlContent) return;

    try {
      await brevoClient.transactionalEmails.sendTransacEmail({
        subject,
        htmlContent,
        sender: SENDER,
        replyTo: REPLY_TO,
        to: [{ email: toEmail, name: toName }]
      });
      console.log(`[Email] Sent "${subject}" to ${toEmail}`);
    } catch (error) {
      console.error(`[Email] Failed to send "${subject}" to ${toEmail}:`, error);
    }
  }

  /* ── Member Added ── */
  static async sendMemberAdded(email: string, name: string, projectName: string, role: string) {
    await this.sendEmail(email, name, `You've been added to "${projectName}"`, 'member-added', {
      userName: name,
      projectName,
      role,
    });
  }

  /* ── Task Assigned ── */
  static async sendTaskAssigned(
    assigneeEmail: string,
    assigneeName: string,
    assignerName: string,
    projectName: string,
    taskTitle: string,
    dueDate: string
  ) {
    await this.sendEmail(assigneeEmail, assigneeName, `New task assigned: "${taskTitle}"`, 'task-assigned', {
      assigneeName,
      assignerName,
      projectName,
      taskTitle,
      dueDate,
    });
  }

  /* ── Task Completed (notify PI) ── */
  static async sendTaskCompleted(
    piEmail: string,
    piName: string,
    completedBy: string,
    projectName: string,
    taskTitle: string
  ) {
    await this.sendEmail(piEmail, piName, `Task completed: "${taskTitle}"`, 'task-completed', {
      piName,
      completedBy,
      projectName,
      taskTitle,
    });
  }

  /* ── Proposal Submitted (notify Reviewer) ── */
  static async sendProposalSubmitted(
    reviewerEmail: string,
    reviewerName: string,
    submitterName: string,
    projectName: string
  ) {
    await this.sendEmail(
      reviewerEmail,
      reviewerName,
      `Proposal review required: "${projectName}"`,
      'proposal-submitted',
      { reviewerName, submitterName, projectName }
    );
  }

  /* ── Proposal Reviewed (notify PI / team) ── */
  static async sendProposalReviewed(
    piEmail: string,
    piName: string,
    reviewerName: string,
    projectName: string,
    decision: 'APPROVE' | 'REVISE'
  ) {
    const isApproved = decision === 'APPROVE';
    await this.sendEmail(
      piEmail,
      piName,
      isApproved ? `Proposal approved for "${projectName}"` : `Proposal revision requested for "${projectName}"`,
      'proposal-reviewed',
      {
        piName,
        reviewerName,
        projectName,
        badgeClass: isApproved ? 'badge-approve' : 'badge-revise',
        badgeText: isApproved ? 'Proposal Approved' : 'Revision Required',
        infoBoxClass: isApproved ? 'info-box-approve' : 'info-box-revise',
        decisionMessage: isApproved
          ? `Great news! Your proposal for "${projectName}" has been approved by the reviewer. You can now begin the Literature Review stage.`
          : `Your proposal for "${projectName}" has been returned for revision. Please review the feedback and resubmit.`,
        actionMessage: isApproved
          ? 'Log in to CRMP to advance to the Literature Review stage.'
          : 'Log in to CRMP to update and resubmit your proposal.',
      }
    );
  }

  /* ── Stage Advanced (notify all members) ── */
  static async sendStageAdvanced(
    memberEmail: string,
    memberName: string,
    advancedBy: string,
    projectName: string,
    newStage: string
  ) {
    const stageLabel = newStage.replace(/_/g, ' ');
    await this.sendEmail(
      memberEmail,
      memberName,
      `"${projectName}" advanced to ${stageLabel}`,
      'stage-advanced',
      { userName: memberName, advancedBy, projectName, newStage: stageLabel }
    );
  }

  /* ── Report Submitted (notify Reviewer) ── */
  static async sendReportSubmitted(
    reviewerEmail: string,
    reviewerName: string,
    submitterName: string,
    projectName: string
  ) {
    await this.sendEmail(
      reviewerEmail,
      reviewerName,
      `Final report submitted for review: "${projectName}"`,
      'report-submitted',
      { reviewerName, submitterName, projectName }
    );
  }
}
