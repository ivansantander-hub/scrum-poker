import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class RoomMemberRepository {
  constructor(private databaseService: DatabaseService) {}

  addMember(roomId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)`,
        [roomId, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  findRoomsByUserId(userId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.all(
        `SELECT r.*, rm.joined_at
         FROM room_members rm
         JOIN rooms r ON r.id = rm.room_id
         WHERE rm.user_id = ?
         ORDER BY rm.joined_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
  }

  findMembersByRoomId(roomId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.all(
        `SELECT u.id, u.email, u.name, u.role, rm.joined_at
         FROM room_members rm
         JOIN users u ON u.id = rm.user_id
         WHERE rm.room_id = ?
         ORDER BY rm.joined_at ASC`,
        [roomId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
  }

  deleteByRoomId(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(`DELETE FROM room_members WHERE room_id = ?`, [roomId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
