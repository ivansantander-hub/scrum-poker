import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoomRepository } from '../database/room.repository';
import { RoomMemberRepository } from '../database/room-member.repository';
import { PlayerRepository } from '../database/player.repository';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('rooms')
export class RoomsController {
  constructor(
    private roomRepository: RoomRepository,
    private roomMemberRepository: RoomMemberRepository,
    private playerRepository: PlayerRepository,
    private databaseService: DatabaseService,
  ) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyRooms(@CurrentUser() user: { userId: string }) {
    return this.roomRepository.findByOwnerId(user.userId);
  }

  @Get('participated')
  @UseGuards(JwtAuthGuard)
  async getParticipatedRooms(@CurrentUser() user: { userId: string }) {
    return this.roomMemberRepository.findRoomsByUserId(user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('god')
  async getAllRooms() {
    return this.roomRepository.findAllRooms();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteRoom(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    const room = await this.roomRepository.findById(id);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.owner_id !== user.userId && user.role !== 'god') {
      throw new ForbiddenException();
    }

    await this.databaseService.deleteRoundsByRoomId(id);
    await this.playerRepository.deleteByRoomId(id);
    await this.roomMemberRepository.deleteByRoomId(id);
    await this.roomRepository.delete(id);

    return { success: true };
  }
}
