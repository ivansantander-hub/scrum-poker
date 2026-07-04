import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository, UserRow } from '../database/user.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAccessPayload } from './strategies/jwt-access.strategy';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: SafeUser }> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const id = uuidv4();
    await this.userRepository.create(id, dto.email, passwordHash, dto.name);

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UnauthorizedException('Failed to create user');
    }

    const accessToken = this.generateAccessToken(user);
    return { accessToken, user: this.toSafeUser(user) };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: SafeUser }> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user);
    return { accessToken, user: this.toSafeUser(user) };
  }

  async refreshToken(userId: string): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.generateAccessToken(user);
    return { accessToken };
  }

  generateAccessToken(user: UserRow): string {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const options: JwtSignOptions = {
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as JwtSignOptions['expiresIn'],
    };
    return this.jwtService.sign(payload, options);
  }

  generateRefreshToken(user: UserRow): string {
    const options: JwtSignOptions = {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as JwtSignOptions['expiresIn'],
    };
    return this.jwtService.sign({ sub: user.id, type: 'refresh' }, options);
  }

  async validateUser(userId: string): Promise<SafeUser | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }
    return this.toSafeUser(user);
  }

  verifyAccessToken(token: string): JwtAccessPayload {
    return this.jwtService.verify<JwtAccessPayload>(token, {
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    });
  }

  private toSafeUser(user: UserRow): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
    };
  }
}
