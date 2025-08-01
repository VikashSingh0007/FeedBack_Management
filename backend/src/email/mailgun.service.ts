import { Injectable } from '@nestjs/common';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailgunService {
  private mg;
  private domain: string;
  private fromEmail: string;
  private adminEmail: string;
  private frontendUrl: string;
  private adminUrl: string;

  constructor(private configService: ConfigService) {
   const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    if (!apiKey) {
      throw new Error('MAILGUN_API_KEY is not configured');
    }

    this.mg = new Mailgun(formData).client({
      username: 'api',
      key: apiKey,
    });

    this.domain = this.configService.get<string>('MAILGUN_DOMAIN') || '';
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || '';
    this.adminEmail = this.configService.get<string>('ADMIN_EMAIL') || '';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    this.adminUrl = this.configService.get<string>('ADMIN_URL') || '';
  }
  async sendFeedbackConfirmation(to: string, feedbackId: string, type: string) {
    const html = `
      <h2>Your ${type} has been received</h2>
      <p>ID: <strong>${feedbackId}</strong></p>
      <a href="${this.frontendUrl}/feedback/${feedbackId}">
        View Details
      </a>
      <p>We'll notify you when there are updates.</p>
    `;

    await this.mg.messages.create(this.domain, {
      from: this.fromEmail,
      to: [to],
      subject: `${type.charAt(0).toUpperCase() + type.slice(1)} Received: ${feedbackId}`,
      html,
    });
  }

  async sendAdminNotification(feedback: any) {
    const html = `
      <h2>New ${feedback.type} submitted</h2>
      <p><strong>ID:</strong> ${feedback.cardId}</p>
      <p><strong>User:</strong> ${feedback.user?.email || 'Anonymous'}</p>
      <p><strong>Content:</strong> ${feedback.content.substring(0, 100)}${feedback.content.length > 100 ? '...' : ''}</p>
      <a href="${this.adminUrl}/feedback/${feedback.cardId}">
        Review in Admin Dashboard
      </a>
    `;

    await this.mg.messages.create(this.domain, {
      from: this.fromEmail,
      to: [this.adminEmail],
      subject: `New ${feedback.type}: ${feedback.cardId}`,
      html,
    });
  }
}