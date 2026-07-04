import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppGateway } from './websockets/app.gateway';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { StructuredLogger } from './common/structured-logger.service';
import { SeedService } from './database/seed.service';
import { join } from 'path';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
        {
          name: 'vote',
          ttl: 1000, // 1 second
          limit: 3, // 3 votes per second (prevent spam)
        },
      ],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      exclude: [
        '/health',
        '/avatars',
        '/socket.io/{*path}',
        '/auth/{*path}',
        '/users/{*path}',
        '/rooms/{*path}',
      ],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    AppGateway,
    StructuredLogger,
    SeedService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
