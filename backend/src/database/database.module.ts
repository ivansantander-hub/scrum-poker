import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { RoomRepository } from './room.repository';
import { PlayerRepository } from './player.repository';

@Global()
@Module({
  providers: [DatabaseService, RoomRepository, PlayerRepository],
  exports: [DatabaseService, RoomRepository, PlayerRepository],
})
export class DatabaseModule {}
