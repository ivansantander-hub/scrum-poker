import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  // In Docker: /app/backend/dist/public/characters (from dist/app.service.js)
  // Locally: ../../frontend/public/characters
  private readonly avatarsPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'public/characters')
    : path.join(__dirname, '../../frontend/public/characters');

  getHello(): string {
    return 'Hello World!';
  }

  getAvatars(): string[] {
    try {
      const files = fs.readdirSync(this.avatarsPath);
      return files.filter(file => /\.(gif|webp)$/i.test(file));
    } catch {
      return [];
    }
  }
}
