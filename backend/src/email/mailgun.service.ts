import { Injectable, Logger } from '@nestjs/common';
import * as FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailgunService {
  private readonly logger = new Logger(MailgunService.name);
  private mg: any;
  private readonly domain: string;
  private readonly fromEmail: string;
  private readonly adminEmail: string;
  private readonly frontendUrl: string;
  private readonly adminUrl: string;

  constructor(private configService: ConfigService) {
    this.logger.log('Initializing Mailgun service...');

    // Get configuration with fallbacks and validation
    const apiKey = this.getRequiredConfig('MAILGUN_API_KEY');
    this.domain = this.getRequiredConfig('MAILGUN_DOMAIN');
    this.fromEmail = this.getRequiredConfig('EMAIL_FROM');
    this.adminEmail = this.getConfigWithDefault('ADMIN_EMAIL', this.fromEmail);
    this.frontendUrl = this.getConfigWithDefault('FRONTEND_URL', '');
    this.adminUrl = this.getConfigWithDefault('ADMIN_URL', '');

    // Initialize Mailgun client
    try {
      const mailgun = new (Mailgun as any)(FormData);
      this.mg = mailgun.client({
        username: 'api',
        key: apiKey,
      });
      this.logger.log('Mailgun client initialized successfully');
    } catch (err) {
      this.logger.error('Failed to initialize Mailgun client', err.stack);
      throw err;
    }
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      this.logger.error(`Missing required configuration: ${key}`);
      throw new Error(`Configuration ${key} is required`);
    }
    return value;
  }

  private getConfigWithDefault(key: string, defaultValue: string): string {
    return this.configService.get<string>(key) || defaultValue;
  }

async sendFeedbackConfirmation(to: string, feedbackId: string, type: string) {
  try {
    this.logger.log(`Sending confirmation to ${to} for feedback ${feedbackId}`);
    
    // Validate email format
    if (!to || !to.includes('@')) {
      throw new Error('Invalid recipient email address');
    }

    // Create a random feedback link (in production, use your actual frontend URL)
    const feedbackLink = this.frontendUrl 
      ? `${this.frontendUrl}/feedback/${feedbackId}`
      : `https://example.com/feedback/${feedbackId}?token=${Math.random().toString(36).substring(2)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Your ${type} has been received!</h2>
        <p>Thank you for submitting your ${type}. Here are the details:</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Reference ID:</strong> ${feedbackId}</p>
          <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
          <p><strong>Status:</strong> Received</p>
        </div>
        
        <p>You can view and track the progress of your ${type} here:</p>
        <a href="${feedbackLink}" 
           style="display: inline-block; background: #2563eb; color: white; 
                  padding: 12px 24px; border-radius: 4px; text-decoration: none; 
                  font-weight: bold; margin: 16px 0;">
          View Your ${type.charAt(0).toUpperCase() + type.slice(1)}
        </a>
        
        <p style="font-size: 14px; color: #6b7280;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          ${feedbackLink}
        </p>
        
        <p>We'll notify you when there are updates.</p>
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;
                    font-size: 12px; color: #6b7280;">
          <p>This is an automated message - please do not reply directly to this email.</p>
        </div>
      </div>
    `;

    const messageData = {
      from: this.fromEmail,
      to: to,
      subject: `${type.charAt(0).toUpperCase() + type.slice(1)} Received (ID: ${feedbackId})`,
      html,
      text: `Your ${type} has been received.\n\nReference ID: ${feedbackId}\n\nView your ${type} here: ${feedbackLink}\n\nWe'll notify you when there are updates.`
    };

    this.logger.debug('Sending email with data:', messageData);
    const result = await this.mg.messages.create(this.domain, messageData);
    this.logger.log(`Email sent successfully to ${to}`);
    return result;
  } catch (error) {
    this.logger.error(`Failed to send to ${to}`, {
      error: error.message,
      response: error.response?.body,
      stack: error.stack
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

  async sendAdminNotification(feedback: any) {
    try {
      this.logger.log(`Sending admin notification for feedback ${feedback.cardId}`);

      const html = `
        <h2>New ${feedback.type} submitted</h2>
        <p><strong>ID:</strong> ${feedback.cardId}</p>
        <p><strong>User:</strong> ${feedback.user?.email || 'Anonymous'}</p>
        <p><strong>Content:</strong> ${feedback.content.substring(0, 100)}${feedback.content.length > 100 ? '...' : ''}</p>
        ${this.adminUrl ? `<a href="${this.adminUrl}/feedback/${feedback.cardId}">Review in Admin Dashboard</a>` : ''}
      `;

      const messageData = {
        from: this.fromEmail,
        to: [this.adminEmail],
        subject: `New ${feedback.type}: ${feedback.cardId}`,
        html,
      };

      const result = await this.mg.messages.create(this.domain, messageData);
      this.logger.log(`Admin notification sent successfully for ${feedback.cardId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send admin notification for ${feedback.cardId}`, error.stack);
      throw new Error(`Failed to send admin notification: ${error.message}`);
    }
  }
}