import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { diskStorage } from 'multer';

@UseGuards(JwtAuthGuard)
@Controller('plants')
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreatePlantDto) {
    return this.plantsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.plantsService.findAllForUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.plantsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdatePlantDto) {
    return this.plantsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.plantsService.remove(req.user.userId, id);
  }

  @Post(':id/identify')
identify(@Request() req, @Param('id') id: string) {
  return this.plantsService.identify(req.user.userId, id);
}

  @Post(':id/photo')
@UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      callback(null, uniqueName);
    },
  }),
}))
uploadPhoto(@Request() req, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
  return this.plantsService.setPhoto(req.user.userId, id, `/uploads/${file.filename}`);
}
}