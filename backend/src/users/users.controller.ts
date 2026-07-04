import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../database/user.repository';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: { userId: string }) {
    const safeUser = await this.authService.validateUser(user.userId);
    if (!safeUser) {
      throw new NotFoundException('User not found');
    }
    return safeUser;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateUserDto,
  ) {
    if (!dto.name && !dto.password) {
      throw new BadRequestException('Nothing to update');
    }

    if (dto.name) {
      await this.userRepository.updateName(user.userId, dto.name);
    }

    if (dto.password) {
      const passwordHash = await bcrypt.hash(dto.password, 12);
      await this.userRepository.updatePasswordHash(user.userId, passwordHash);
    }

    const safeUser = await this.authService.validateUser(user.userId);
    if (!safeUser) {
      throw new NotFoundException('User not found');
    }
    return safeUser;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  async listAll() {
    const users = await this.userRepository.findAll();
    return users.map(({ password_hash: _, ...rest }) => rest);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    if (user.userId !== id && user.role !== 'god') {
      throw new ForbiddenException();
    }

    const found = await this.userRepository.findById(id);
    if (!found) {
      throw new NotFoundException('User not found');
    }

    const { password_hash: _, ...safeUser } = found;
    return safeUser;
  }
}
