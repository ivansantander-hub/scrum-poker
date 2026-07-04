import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: string;
}

@Injectable()
export class UserRepository {
  constructor(private databaseService: DatabaseService) {}

  create(
    id: string,
    email: string,
    passwordHash: string,
    name: string,
    role = 'user',
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
        [id, email, passwordHash, name, role],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  findByEmail(email: string): Promise<UserRow | undefined> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as UserRow | undefined);
        },
      );
    });
  }

  findById(id: string): Promise<UserRow | undefined> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.get(
        `SELECT * FROM users WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as UserRow | undefined);
        },
      );
    });
  }

  findAll(): Promise<UserRow[]> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.all(`SELECT * FROM users ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as UserRow[]);
      });
    });
  }

  updateName(id: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(`UPDATE users SET name = ? WHERE id = ?`, [name, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.run(
        `UPDATE users SET password_hash = ? WHERE id = ?`,
        [passwordHash, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  countByRole(role: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const db = this.databaseService.getDatabase();
      db.get(
        `SELECT COUNT(*) as count FROM users WHERE role = ?`,
        [role],
        (err, row: { count: number }) => {
          if (err) reject(err);
          else resolve(row?.count ?? 0);
        },
      );
    });
  }
}
