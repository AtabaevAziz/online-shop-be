import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProductEntity } from './entities/product.entity';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsOrmRepository: Repository<ProductEntity>,
  ) {}

  findById(id: string): Promise<ProductEntity | null> {
    return this.productsOrmRepository.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<ProductEntity | null> {
    return this.productsOrmRepository.findOne({ where: { slug } });
  }

  findAll(): Promise<ProductEntity[]> {
    return this.productsOrmRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  create(entity: ProductEntity): Promise<ProductEntity> {
    // The ORM converts the entity into SQL INSERT/UPDATE operations for the database.
    return this.productsOrmRepository.save(
      this.productsOrmRepository.create({
        name: entity.name,
        slug: entity.slug,
        description: entity.description,
        price: entity.price,
        imageUrl: entity.imageUrl,
      }),
    );
  }

  update(entity: ProductEntity): Promise<ProductEntity> {
    return this.productsOrmRepository.save(entity);
  }

  async remove(id: string): Promise<ProductEntity> {
    const product = await this.productsOrmRepository.findOneOrFail({
      where: { id },
    });

    return this.productsOrmRepository.remove(product);
  }
}
