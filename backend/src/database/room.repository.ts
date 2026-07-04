import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

export interface RoomRow {
  id: string;
  code: string;
  estimation_type: string;
  is_revealed: number;
  is_started: number;
  host_id: string;
  round_count: number;
  created_at: string;
}

@Injectable()
export class RoomRepository {
  constructor(private databaseService: DatabaseService) {}

  create(id: string, code: string, estimationType: string, hostId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `INSERT INTO rooms (id, code, estimation_type, host_id) VALUES (?, ?, ?, ?)`,
        [id, code, estimationType, hostId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  findByCode(code: string): Promise<RoomRow | undefined> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.get(
        `SELECT * FROM rooms WHERE code = ?`,
        [code],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as RoomRow | undefined);
        }
      );
    });
  }

  findById(id: string): Promise<RoomRow | undefined> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.get(
        `SELECT * FROM rooms WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as RoomRow | undefined);
        }
      );
    });
  }

  updateIsStarted(id: string, isStarted: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `UPDATE rooms SET is_started = ? WHERE id = ?`,
        [isStarted ? 1 : 0, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  updateIsRevealed(id: string, isRevealed: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `UPDATE rooms SET is_revealed = ? WHERE id = ?`,
        [isRevealed ? 1 : 0, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(`DELETE FROM rooms WHERE id = ?`, [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updateHostId(id: string, hostId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `UPDATE rooms SET host_id = ? WHERE id = ?`,
        [hostId, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  incrementRoundCount(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `UPDATE rooms SET round_count = round_count + 1 WHERE id = ?`,
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}
