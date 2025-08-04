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
}