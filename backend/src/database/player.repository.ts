import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

export interface PlayerRow {
  id: string;
  room_id: string;
  socket_id: string | null;
  name: string;
  avatar: string;
  is_host: number;
  has_voted: number;
  vote: string | null;
  created_at: string;
}

@Injectable()
export class PlayerRepository {
  constructor(private databaseService: DatabaseService) {}

  create(id: string, roomId: string, name: string, avatar: string, isHost: boolean, socketId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `INSERT INTO players (id, room_id, name, avatar, is_host, socket_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, roomId, name, avatar, isHost ? 1 : 0, socketId || null],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  findById(id: string): Promise<PlayerRow | undefined> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.get(
        `SELECT * FROM players WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as PlayerRow | undefined);
        }
      );
    });
  }

  findByRoomId(roomId: string): Promise<PlayerRow[]> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.all(
        `SELECT * FROM players WHERE room_id = ?`,
        [roomId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as PlayerRow[]);
        }
      );
    });
  }

  findByRoomIdAndPlayerId(roomId: string, playerId: string): Promise<PlayerRow | undefined> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.get(
        `SELECT * FROM players WHERE room_id = ? AND id = ?`,
        [roomId, playerId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as PlayerRow | undefined);
        }
      );
    });
  }

  updateSocketId(id: string, socketId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `UPDATE players SET socket_id = ? WHERE id = ?`,
        [socketId, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  clearSocketId(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `UPDATE players SET socket_id = NULL WHERE id = ?`,
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  updateVote(id: string, vote: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `UPDATE players SET vote = ?, has_voted = 1 WHERE id = ?`,
        [vote, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  resetVotesByRoomId(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `UPDATE players SET vote = NULL, has_voted = 0 WHERE room_id = ?`,
        [roomId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  updateHostByRoomId(roomId: string, newHostId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.serialize(() => {
        db.run(
          `UPDATE players SET is_host = 0 WHERE room_id = ?`,
          [roomId],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
          }
        );
        db.run(
          `UPDATE players SET is_host = 1 WHERE id = ?`,
          [newHostId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });
  }

  delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(`DELETE FROM players WHERE id = ?`, [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  deleteByRoomId(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(`DELETE FROM players WHERE room_id = ?`, [roomId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
