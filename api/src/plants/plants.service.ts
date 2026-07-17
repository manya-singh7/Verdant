import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';

@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

  async setPhoto(userId: string, plantId: string, photoUrl: string) {
  await this.findOne(userId, plantId); // ownership check

  return this.prisma.plant.update({
    where: { id: plantId },
    data: { photoUrl },
  });
}
  create(userId: string, dto: CreatePlantDto) {
    return this.prisma.plant.create({
      data: {
        ...dto,
        ownerId: userId,
      },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.plant.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, plantId: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
    });

    if (!plant) {
      throw new NotFoundException('Plant not found');
    }

    if (plant.ownerId !== userId) {
      throw new ForbiddenException('You do not own this plant');
    }

    return plant;
  }

  async update(userId: string, plantId: string, dto: UpdatePlantDto) {
    await this.findOne(userId, plantId); // reuses ownership check

    return this.prisma.plant.update({
      where: { id: plantId },
      data: dto,
    });
  }

  async remove(userId: string, plantId: string) {
    await this.findOne(userId, plantId); // reuses ownership check

    return this.prisma.plant.delete({
      where: { id: plantId },
    });
  }
}