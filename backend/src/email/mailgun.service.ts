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

    this.logger.log('Mailgun configuration loaded:', {
      hasApiKey: !!apiKey,
      domain: this.domain,
      fromEmail: this.fromEmail,
      adminEmail: this.adminEmail,
      frontendUrl: this.frontendUrl || 'Not set',
      adminUrl: this.adminUrl || 'Not set'
    });

    // Initialize Mailgun client
    try {
      const mailgun = new (Mailgun as any)(FormData);
      this.mg = mailgun.client({
        username: 'api',
        key: apiKey,
      });
      this.logger.log('✅ Mailgun client initialized successfully');
    } catch (err) {
      this.logger.error('❌ Failed to initialize Mailgun client', err.stack);
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
// Add this to your MailgunService
async sendFeedbackStatusUpdate(to: string, feedbackId: string, type: string, status: string) {
  this.logger.log(`[MailgunService] ===== SEND FEEDBACK STATUS UPDATE START =====`);
  this.logger.log(`[MailgunService] To: ${to}`);
  this.logger.log(`[MailgunService] Feedback ID: ${feedbackId}`);
  this.logger.log(`[MailgunService] Type: ${type}`);
  this.logger.log(`[MailgunService] Status: ${status}`);
  
  try {
    this.logger.log(`[MailgunService] Validating email address...`);
    if (!to || !to.includes('@')) {
      throw new Error('Invalid recipient email address');
    }
    this.logger.log(`[MailgunService] Email validation passed`);
    
    const statusLabels = {
      'pending': 'Pending',
      'in_progress': 'In Progress', 
      'resolved': 'Resolved',
      'rejected': 'Rejected'
    };

    const statusColor = {
      'pending': '#f59e0b',
      'in_progress': '#3b82f6',
      'resolved': '#10b981', 
      'rejected': '#ef4444'
    };

    const feedbackLink = this.frontendUrl 
      ? `${this.frontendUrl}/feedback/${feedbackId}`
      : `https://example.com/feedback/${feedbackId}`;
    
    this.logger.log(`[MailgunService] Frontend URL: ${this.frontendUrl || 'Not set'}`);
    this.logger.log(`[MailgunService] Generated feedback link: ${feedbackLink}`);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Status Update for Your ${type.charAt(0).toUpperCase() + type.slice(1)}</h2>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Reference ID:</strong> ${feedbackId}</p>
          <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
          <p><strong>New Status:</strong> 
            <span style="color: ${statusColor[status]}; font-weight: bold;">
              ${statusLabels[status]}
            </span>
          </p>
        </div>
        
        <p>Your ${type} status has been updated. You can view the current status and any additional comments here:</p>
        
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
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;
                    font-size: 12px; color: #6b7280;">
          <p>This is an automated message - please do not reply directly to this email.</p>
        </div>
      </div>
    `;

    const messageData = {
      from: this.fromEmail,
      to: to,
      subject: `${type.charAt(0).toUpperCase() + type.slice(1)} Status Updated to ${statusLabels[status]} (ID: ${feedbackId})`,
      html,
      text: `Your ${type} status has been updated to ${statusLabels[status]}.\n\nReference ID: ${feedbackId}\n\nView your ${type} here: ${feedbackLink}`
    };

    this.logger.log(`[MailgunService] Message data prepared:`, {
      from: messageData.from,
      to: messageData.to,
      subject: messageData.subject,
      hasHtml: !!messageData.html,
      hasText: !!messageData.text
    });

    this.logger.log(`[MailgunService] Sending email via Mailgun...`);
    const result = await this.mg.messages.create(this.domain, messageData);
    this.logger.log(`[MailgunService] ✅ Email sent successfully to ${to}`);
    this.logger.log(`[MailgunService] Mailgun response:`, result);
    this.logger.log(`[MailgunService] ===== SEND FEEDBACK STATUS UPDATE SUCCESS =====`);
    return result;
  } catch (error) {
    this.logger.error(`[MailgunService] ===== SEND FEEDBACK STATUS UPDATE FAILED =====`);
    this.logger.error(`[MailgunService] Failed to send to ${to}`, {
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

  async sendAdminStatusUpdateNotification(feedback: any) {
    try {
      this.logger.log(`Sending admin status update notification for feedback ${feedback.cardId}`);
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Ticket Status Updated</h2>
          <p>A ticket status has been updated and requires your attention.</p>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Ticket ID:</strong> ${feedback.cardId}</p>
            <p><strong>Type:</strong> ${feedback.type}</p>
            <p><strong>New Status:</strong> ${feedback.status}</p>
            <p><strong>Category:</strong> ${feedback.category || 'N/A'}</p>
            <p><strong>Department:</strong> ${feedback.department || 'N/A'}</p>
            <p><strong>Updated:</strong> ${new Date(feedback.updatedAt).toLocaleString()}</p>
          </div>
          
          <p>Please review the ticket and take appropriate action.</p>
          
          <a href="${this.adminUrl}/feedback/${feedback.cardId}" 
             style="display: inline-block; background: #dc2626; color: white; 
                    padding: 12px 24px; border-radius: 4px; text-decoration: none; 
                    font-weight: bold; margin: 16px 0;">
            View Ticket
          </a>
          
          <p style="font-size: 14px; color: #6b7280;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      `;

      await this.mg.messages.create(this.domain, {
        from: this.fromEmail,
        to: this.adminEmail,
        subject: `Ticket Status Updated: ${feedback.cardId}`,
        html: html,
      });

      this.logger.log(`✅ Admin status update notification sent successfully for ${feedback.cardId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send admin status update notification for ${feedback.cardId}:`, error);
      throw error;
    }
  }

  async sendChatMessageNotification(
    to: string, 
    feedbackId: string, 
    message: string, 
    senderName: string, 
    isAdmin: boolean
  ) {
    try {
      this.logger.log(`Sending chat message notification to ${to} for feedback ${feedbackId}`);
      
      // Validate email format
      if (!to || !to.includes('@')) {
        throw new Error('Invalid recipient email address');
      }

      const senderType = isAdmin ? 'Admin' : 'User';
      const messagePreview = message.length > 100 ? message.substring(0, 100) + '...' : message;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Message on Ticket</h2>
          <p>You have received a new message on your ticket.</p>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Ticket ID:</strong> ${feedbackId}</p>
            <p><strong>From:</strong> ${senderName} (${senderType})</p>
            <p><strong>Message:</strong> ${messagePreview}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>Click below to view the full conversation and respond:</p>
          
          <a href="${this.frontendUrl}/feedback/${feedbackId}" 
             style="display: inline-block; background: #2563eb; color: white; 
                    padding: 12px 24px; border-radius: 4px; text-decoration: none; 
                    font-weight: bold; margin: 16px 0;">
            View Ticket & Respond
          </a>
          
          <p style="font-size: 14px; color: #6b7280;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            ${this.frontendUrl}/feedback/${feedbackId}
          </p>
          
          <p style="font-size: 14px; color: #6b7280;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      `;

      await this.mg.messages.create(this.domain, {
        from: this.fromEmail,
        to: to,
        subject: `New Message on Ticket ${feedbackId}`,
        html: html,
      });

      this.logger.log(`✅ Chat message notification sent successfully to ${to} for ${feedbackId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send chat message notification to ${to} for ${feedbackId}:`, error);
      throw error;
    }
  }

  async sendTicketUpdateNotification(
    to: string,
    feedbackId: string,
    updateType: 'status' | 'priority' | 'assignment' | 'resolution',
    details: any
  ) {
    try {
      this.logger.log(`Sending ticket update notification to ${to} for feedback ${feedbackId}`);
      
      // Validate email format
      if (!to || !to.includes('@')) {
        throw new Error('Invalid recipient email address');
      }

      const updateMessages = {
        status: `Status changed to: ${details.status}`,
        priority: `Priority updated to: ${details.priority}`,
        assignment: `Ticket assigned to: ${details.assignedTo}`,
        resolution: `Ticket resolved with comment: ${details.adminResponse || 'No comment provided'}`
      };

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Ticket Update Notification</h2>
          <p>Your ticket has been updated.</p>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Ticket ID:</strong> ${feedbackId}</p>
            <p><strong>Update Type:</strong> ${updateType.charAt(0).toUpperCase() + updateType.slice(1)}</p>
            <p><strong>Details:</strong> ${updateMessages[updateType]}</p>
            <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>Click below to view the updated ticket:</p>
          
          <a href="${this.frontendUrl}/feedback/${feedbackId}" 
             style="display: inline-block; background: #059669; color: white; 
                    padding: 12px 24px; border-radius: 4px; text-decoration: none; 
                    font-weight: bold; margin: 16px 0;">
            View Updated Ticket
          </a>
          
          <p style="font-size: 14px; color: #6b7280;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            ${this.frontendUrl}/feedback/${feedbackId}
          </p>
          
          <p style="font-size: 14px; color: #6b7280;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      `;

      await this.mg.messages.create(this.domain, {
        from: this.fromEmail,
        to: to,
        subject: `Ticket Update: ${feedbackId}`,
        html: html,
      });

      this.logger.log(`✅ Ticket update notification sent successfully to ${to} for ${feedbackId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send ticket update notification to ${to} for ${feedbackId}:`, error);
      throw error;
    }
  }
}