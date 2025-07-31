// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async register(email: string, password: string) {
    console.log('[AuthService] Registering new user with email:', email);
    const hash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create(email, hash);
    console.log('[AuthService] User created:', {
      id: user.id,
      email: user.email,
      role: user.role // Log the role of newly created user
    });
    return this.generateToken(user);
  }

  async login(email: string, password: string) {
    console.log('[AuthService] Login attempt for email:', email);
    
    const user = await this.usersService.findByEmail(email);
    console.log('[AuthService] User found in database:', {
      id: user?.id,
      email: user?.email,
      role: user?.role // This is crucial - check if role exists
    });

    if (!user) {
      console.log('[AuthService] User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log('[AuthService] Password comparison failed');
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('[AuthService] Login successful, generating token for user:', {
      id: user.id,
      role: user.role
    });
    
    return this.generateToken(user);
  }

  generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role // Make sure this is included
    };
    console.log('[AuthService] Generating token with payload:', payload);
    
    const token = this.jwtService.sign(payload);
    console.log('[AuthService] Generated token:', token);
    
    return {
      access_token: token
    };
  }
}