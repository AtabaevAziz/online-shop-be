import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './entities/product.entity';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const existingProduct = await this.productsRepository.findOneBy({
      slug: dto.slug,
    });

    if (existingProduct) {
      throw new ConflictException('Product with this slug already exists');
    }

    const product = await this.productsRepository.save(
      this.productsRepository.create({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
      }),
    );

    return this.toResponseDto(product);
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productsRepository.find();
    return products.map((product) => this.toResponseDto(product));
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.getProductOrThrow(id);
    return this.toResponseDto(product);
  }

  async findOneBySlug(slug: string): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findOneBy({ slug });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} was not found`);
    }

    return this.toResponseDto(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.getProductOrThrow(id);

    if (dto.slug && dto.slug !== product.slug) {
      const existingProduct = await this.productsRepository.findOneBy({
        slug: dto.slug,
      });
      if (existingProduct && existingProduct.id !== product.id) {
        throw new ConflictException('Product with this slug already exists');
      }
    }

    const updatedProduct = await this.productsRepository.preload({
      id: product.id,
      name: dto.name ?? product.name,
      slug: dto.slug ?? product.slug,
      description: dto.description ?? product.description,
      price: dto.price ?? product.price,
      imageUrl: dto.imageUrl ?? product.imageUrl,
    });

    if (!updatedProduct) {
      throw new NotFoundException(`Product with id ${id} was not found`);
    }

    return this.toResponseDto(
      await this.productsRepository.save(updatedProduct),
    );
  }

  async remove(id: string): Promise<ProductResponseDto> {
    const product = await this.getProductOrThrow(id);
    const deletedProduct = await this.productsRepository.remove(product);
    return this.toResponseDto(deletedProduct);
  }

  async demoTimeout(): Promise<{ status: 'completed'; waitedMs: number }> {
    const waitedMs = 6000;
    await new Promise((resolve) => setTimeout(resolve, waitedMs));

    return {
      status: 'completed',
      waitedMs,
    };
  }

  private toResponseDto(product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    imageUrl: string;
    createdAt: Date;
    updatedAt: Date;
  }): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private async getProductOrThrow(id: string): Promise<ProductEntity> {
    const product = await this.productsRepository.findOne(id);

    if (!product) {
      throw new NotFoundException(`Product with id ${id} was not found`);
    }

    return product;
  }
}
