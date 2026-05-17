import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const { passwordHash: _, ...user } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const data: Partial<User> = {};
    if (dto.name) data.name = dto.name;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    const { passwordHash: _, ...user } = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return user;
  }
}
