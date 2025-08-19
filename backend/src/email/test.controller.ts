import { Controller, Get } from '@nestjs/common';
import { MailgunService } from './mailgun.service';

@Controller('email-test')  // Changed path to be more specific
export class TestController {
  constructor(private mailgunService: MailgunService) {}

  @Get('send')
  async testEmail() {
    try {
      // Use your actual email here for testing
      const testEmail = 'Singhvikash7077@gmail.com'; 
      
      console.log(`Attempting to send test email to ${testEmail}`);
      
      const result = await this.mailgunService.sendFeedbackConfirmation(
        testEmail,
        'TEST-123',
        'feedback'
      );
      
      return {
        success: true,
        message: 'Test email sent successfully',
        mailgunResponse: result
      };
    } catch (error) {
      console.error('Email test failed:', error);
      return {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  @Get('status-update')
  async testStatusUpdateEmail() {
    try {
      const testEmail = 'Singhvikash7077@gmail.com';
      
      console.log(`[TestController] Testing status update email to ${testEmail}`);
      
      // Test user notification
      const userResult = await this.mailgunService.sendFeedbackStatusUpdate(
        testEmail,
        'TEST-456',
        'request',
        'in_progress'
      );
      
      // Test admin notification
      const adminResult = await this.mailgunService.sendAdminStatusUpdateNotification({
        cardId: 'TEST-456',
        type: 'request',
        user: { email: testEmail },
        status: 'in_progress',
        adminResponse: 'This is a test admin response for debugging purposes.'
      });
      
      return {
        success: true,
        message: 'Status update test emails sent successfully',
        userEmail: {
          success: true,
          mailgunResponse: userResult
        },
        adminEmail: {
          success: true,
          mailgunResponse: adminResult
        }
      };
    } catch (error) {
      console.error('[TestController] Status update email test failed:', error);
      return {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
}