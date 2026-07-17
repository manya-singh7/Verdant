import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import axios from 'axios';
import { readFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

  async assessHealth(userId: string, plantId: string) {
    const plant = await this.findOne(userId, plantId); // ownership check

    if (!plant.photoUrl) {
      throw new BadRequestException('This plant has no photo uploaded yet');
    }

    const filename = plant.photoUrl.replace('/uploads/', '');
    const filePath = join(process.cwd(), 'uploads', filename);
    const imageBuffer = await readFile(filePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await axios.post(
      'https://api.plant.id/v3/health_assessment',
      {
        images: [`data:image/jpeg;base64,${base64Image}`],
        similar_images: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': process.env.PLANT_ID_API_KEY,
        },
      },
    );

    const result = response.data.result;
    const isHealthy = result.is_healthy?.binary ?? null;
    const diseaseSuggestions = result.disease?.suggestions ?? [];
    const topDisease = diseaseSuggestions[0] ?? null;

    await this.logEvent(
      plantId,
      'health_checked',
      isHealthy ? 'Health check: looking healthy' : 'Health check: possible issue detected',
    );

    return {
      plantId: plant.id,
      nickname: plant.nickname,
      isHealthy,
      topDiseaseSuggestion: topDisease
        ? { name: topDisease.name, probability: topDisease.probability }
        : null,
      allSuggestions: diseaseSuggestions.map((s: any) => ({
        name: s.name,
        probability: s.probability,
      })),
    };
  }

  async setPhoto(userId: string, plantId: string, photoUrl: string) {
    await this.findOne(userId, plantId);

    const plant = await this.prisma.plant.update({
      where: { id: plantId },
      data: { photoUrl },
    });

    await this.logEvent(plantId, 'photo_uploaded', 'A new photo was uploaded');

    return plant;
  }

  async identify(userId: string, plantId: string) {
    const plant = await this.findOne(userId, plantId); // ownership check

    if (!plant.photoUrl) {
      throw new BadRequestException('This plant has no photo uploaded yet');
    }

    const filename = plant.photoUrl.replace('/uploads/', '');
    const filePath = join(process.cwd(), 'uploads', filename);
    const imageBuffer = await readFile(filePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await axios.post(
      'https://api.plant.id/v3/identification',
      {
        images: [`data:image/jpeg;base64,${base64Image}`],
        similar_images: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': process.env.PLANT_ID_API_KEY,
        },
      },
    );

    const suggestions = response.data.result.classification.suggestions;
    const topMatch = suggestions[0];

    await this.logEvent(
      plantId,
      'identified',
      `AI identified this as ${topMatch.name} (${Math.round(topMatch.probability * 100)}% confidence)`,
    );

    return this.prisma.plant.update({
      where: { id: plantId },
      data: {
        identifiedSpecies: topMatch.name,
        identificationConfidence: topMatch.probability,
      },
    });
  }

  async create(userId: string, dto: CreatePlantDto) {
    const plant = await this.prisma.plant.create({
      data: {
        ...dto,
        ownerId: userId,
      },
    });

    await this.logEvent(plant.id, 'created', `${plant.nickname} was added to Verdant`);

    return plant;
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

  async getTimeline(userId: string, plantId: string) {
    await this.findOne(userId, plantId); // ownership check

    return this.prisma.plantEvent.findMany({
      where: { plantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async logEvent(plantId: string, type: string, description: string) {
    return this.prisma.plantEvent.create({
      data: { plantId, type, description },
    });
  }

  async remove(userId: string, plantId: string) {
    await this.findOne(userId, plantId); // reuses ownership check

    return this.prisma.plant.delete({
      where: { id: plantId },
    });
  }
}