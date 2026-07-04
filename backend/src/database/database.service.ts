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

      this.db.run(`ALTER TABLE rooms ADD COLUMN round_count INTEGER DEFAULT 0`, (err: any) => {
        if (err && !err.message?.includes('duplicate column')) {
          console.log('Round count column check:', err.message);
        }
      });

      this.db.run(`ALTER TABLE players ADD COLUMN avatar TEXT DEFAULT 'vincent'`, (err: any) => {
        if (err && !err.message?.includes('duplicate column')) {
          console.log('Avatar column check:', err.message);
        }
      });

      this.db.run(`
        CREATE TABLE IF NOT EXISTS rounds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id TEXT NOT NULL,
          round_number INTEGER NOT NULL,
          votes TEXT NOT NULL,
          average TEXT,
          std_dev TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
      `);

      this.db.run(`ALTER TABLE rounds ADD COLUMN std_dev TEXT`, (err: any) => {
        if (err && !err.message?.includes('duplicate column')) {
          console.log('StdDev column check:', err.message);
        }
      });

      this.db.run(`ALTER TABLE rounds ADD COLUMN title TEXT`, (err: any) => {
        if (err && !err.message?.includes('duplicate column')) {
          console.log('Title column check:', err.message);
        }
      });

      this.db.run(`ALTER TABLE rounds ADD COLUMN link TEXT`, (err: any) => {
        if (err && !err.message?.includes('duplicate column')) {
          console.log('Link column check:', err.message);
        }
      });

      this.db.run(`ALTER TABLE rounds ADD COLUMN final_decision TEXT`, (err: any) => {
        if (err && !err.message?.includes('duplicate column')) {
          console.log('Final decision column check:', err.message);
        }
      });

      this.db.run(`CREATE INDEX IF NOT EXISTS idx_rounds_room ON rounds(room_id)`);

      console.log('Database tables initialized');
    });
  }

  getDatabase(): sqlite3.Database {
    return this.db;
  }

  saveRound(roomId: string, roundNumber: number, votes: any, average: string, stdDev?: string, title?: string, link?: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO rounds (room_id, round_number, votes, average, std_dev, title, link) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [roomId, roundNumber, JSON.stringify(votes), average, stdDev || null, title || null, link || null],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  updateRoundDecision(roundId: number, finalDecision: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE rounds SET final_decision = ? WHERE id = ?`,
        [finalDecision, roundId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  getRoundHistory(roomId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM rounds WHERE room_id = ? ORDER BY round_number DESC`,
        [roomId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map((row: any) => ({
            id: row.id,
            roundNumber: row.round_number,
            votes: JSON.parse(row.votes),
            average: row.average,
            stdDev: row.std_dev,
            title: row.title || undefined,
            link: row.link || undefined,
            finalDecision: row.final_decision || undefined,
            createdAt: row.created_at
          })));
        }
      );
    });
  }

  getSessionStats(roomId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM rounds WHERE room_id = ? ORDER BY round_number ASC`,
        [roomId],
        (err, rows: any[]) => {
          if (err) reject(err);
          else {
            const rounds = rows.map(row => ({
              id: row.id,
              roundNumber: row.round_number,
              votes: JSON.parse(row.votes),
              average: row.average,
              stdDev: row.std_dev,
              title: row.title || undefined,
              link: row.link || undefined,
              finalDecision: row.final_decision || undefined,
              createdAt: row.created_at
            }));
            
            const playerStats: Record<string, { name: string; votes: string[]; sum: number; count: number }> = {};
            
            rounds.forEach(round => {
              round.votes.forEach((v: any) => {
                if (!playerStats[v.playerId]) {
                  playerStats[v.playerId] = { name: v.playerName, votes: [], sum: 0, count: 0 };
                }
                const numVal = v.vote?.endsWith('h') ? parseInt(v.vote.replace('h', '')) : parseInt(v.vote);
                if (!isNaN(numVal)) {
                  playerStats[v.playerId].sum += numVal;
                  playerStats[v.playerId].count++;
                }
                playerStats[v.playerId].votes.push(v.vote || '-');
              });
            });

            const overallAvg = rounds.length > 0
              ? (rounds.reduce((sum, r) => sum + parseFloat(r.average || '0'), 0) / rounds.length).toFixed(1)
              : '0';

            resolve({
              totalRounds: rounds.length,
              overallAverage: overallAvg,
              rounds,
              playerStats: Object.entries(playerStats).map(([id, stats]) => ({
                playerId: id,
                playerName: stats.name,
                totalVotes: stats.count,
                average: stats.count > 0 ? (stats.sum / stats.count).toFixed(1) : '-',
                votes: stats.votes
              }))
            });
          }
        }
      );
    });
  }
}
