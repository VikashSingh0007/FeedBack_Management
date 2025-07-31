import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
      
      this.logger.debug(`Required roles: ${JSON.stringify(requiredRoles)}`);

      if (!requiredRoles) {
        this.logger.debug('No roles required, access granted');
        return true;
      }

      const request = context.switchToHttp().getRequest();
      this.logger.debug('Request user:', request.user);

      if (!request.user) {
        this.logger.error('No user found in request!');
        return false;
      }

      const hasRole = requiredRoles.includes(request.user.role);
      this.logger.debug(`Role check: ${request.user.role} in ${JSON.stringify(requiredRoles)} = ${hasRole}`);

      return hasRole;
    } catch (error) {
      this.logger.error('RolesGuard error:', error.message);
      return false;
    }
  }
}