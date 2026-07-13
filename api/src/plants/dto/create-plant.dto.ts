import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePlantDto {
  @IsString()
  @IsNotEmpty()
  nickname!: string;

  @IsString()
  @IsNotEmpty()
  species!: string;

  @IsString()
  @IsOptional()
  scientificName?: string;
}