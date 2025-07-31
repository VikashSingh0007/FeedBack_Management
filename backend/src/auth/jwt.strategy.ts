import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Logger } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your_default_jwt_secret',
    });
  }

  async validate(payload: any) {
    this.logger.debug('JWT Payload:', payload);
    return { 
      userId: payload.sub, 
      email: payload.email, 
      role: payload.role // MUST match what's in your token
    };
  }
}