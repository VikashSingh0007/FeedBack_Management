import { Module } from '@nestjs/common';
import { MailgunService } from './mailgun.service';
import { TestController } from './test.controller';  // Add this import

@Module({
  controllers: [TestController],  // Add the test controller here
  providers: [MailgunService],
  exports: [MailgunService],
})
export class EmailModule {}