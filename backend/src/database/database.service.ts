import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db!: sqlite3.Database;

  onModuleInit() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'scrum-poker.db');
    this.db = new sqlite3.Database(dbPath);
    console.log('Database connected:', dbPath);

    this.initializeTables();
  }

  onModuleDestroy() {
    if (this.db) {
      this.db.close();
    }
  }

  private initializeTables() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          estimation_type TEXT NOT NULL,
          is_revealed INTEGER DEFAULT 0,
          is_started INTEGER DEFAULT 0,
          host_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS players (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          socket_id TEXT,
          name TEXT NOT NULL,
          avatar TEXT DEFAULT 'vincent',
          is_host INTEGER DEFAULT 0,
          has_voted INTEGER DEFAULT 0,
          vote TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
      `);

      this.db.run(`CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id)`);

      this.db.run(`ALTER TABLE players ADD COLUMN avatar TEXT DEFAULT 'vincent'`, (err: any) => {
        if (err && !err.message?.includes('duplicate column')) {
          console.log('Avatar column check:', err.message);
        }
      });

      console.log('Database tables initialized');
    });
  }

  getDatabase(): sqlite3.Database {
    return this.db;
  }
}
