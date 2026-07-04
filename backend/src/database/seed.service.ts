import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from './user.repository';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private userRepository: UserRepository) {}

  async onModuleInit() {
    const godCount = await this.userRepository.countByRole('god');
    if (godCount > 0) {
      return;
    }

    const email = process.env.GOD_EMAIL || 'admin@scrumpoker.com';
    const password = process.env.GOD_PASSWORD || 'Admin123!';
    const passwordHash = await bcrypt.hash(password, 12);

    await this.userRepository.create(uuidv4(), email, passwordHash, 'God Admin', 'god');

    console.log('========================================');
    console.log('God admin account created:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log('========================================');
  }
}
