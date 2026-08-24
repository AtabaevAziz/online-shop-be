import { IsNumber, IsString, IsUrl, Matches, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0.01)
  price!: number;

  @IsUrl()
  imageUrl!: string;
}
