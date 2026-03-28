import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  private readonly avatarsPath = path.join(__dirname, '../../frontend/public/characters');

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
