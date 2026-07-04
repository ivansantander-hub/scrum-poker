import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRepository } from '../database/user.repository';

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userRepository: UserRepository,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    const user = await this.userRepository.findById(result.user.id);
    if (user) {
      this.setRefreshCookie(res, this.authService.generateRefreshToken(user));
    }
    return result;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    const user = await this.userRepository.findById(result.user.id);
    if (user) {
      this.setRefreshCookie(res, this.authService.generateRefreshToken(user));
    }
    return result;
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(200)
  async refresh(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.refreshToken(userId);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { userId: string }) {
    const safeUser = await this.authService.validateUser(user.userId);
    if (!safeUser) {
      return null;
    }
    return safeUser;
  }

  private setRefreshCookie(res: Response, token: string) {
    const secure = process.env.COOKIE_SECURE === 'true';
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });
  }

  private clearRefreshCookie(res: Response) {
    const secure = process.env.COOKIE_SECURE === 'true';
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/auth/refresh',
    });
  }
}
