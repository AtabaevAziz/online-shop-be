export class ProductResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  description!: string;
  price!: number;
  imageUrl!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
