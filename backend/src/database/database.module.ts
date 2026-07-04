import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { RoomRepository } from './room.repository';
import { PlayerRepository } from './player.repository';
import { UserRepository } from './user.repository';
import { RoomMemberRepository } from './room-member.repository';

@Global()
@Module({
  providers: [
    DatabaseService,
    RoomRepository,
    PlayerRepository,
    UserRepository,
    RoomMemberRepository,
  ],
  exports: [
    DatabaseService,
    RoomRepository,
    PlayerRepository,
    UserRepository,
    RoomMemberRepository,
  ],
})
export class DatabaseModule {}
