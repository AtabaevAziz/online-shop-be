import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DeepPartial, DeleteResult, FindManyOptions, FindOptionsWhere, InsertResult, QueryDeepPartialEntity, UpdateResult } from 'typeorm';

import { ProductEntity } from './entities/product.entity';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsOrmRepository: Repository<ProductEntity>,
  ) {}

  find(): Promise<ProductEntity[]> {
    return this.productsOrmRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string): Promise<ProductEntity | null> {
    return this.productsOrmRepository.findOne({ where: { id } });
  }

  findOneBy(where: FindOptionsWhere<ProductEntity>): Promise<ProductEntity | null> {
    return this.productsOrmRepository.findOneBy(where);
  }

  findBy(where: FindOptionsWhere<ProductEntity>): Promise<ProductEntity[]> {
    return this.productsOrmRepository.findBy(where);
  }

  create(data: DeepPartial<ProductEntity>): ProductEntity {
    return this.productsOrmRepository.create(data);
  }

  preload(data: DeepPartial<ProductEntity>): Promise<ProductEntity | undefined> {
    return this.productsOrmRepository.preload(data);
  }

  save(entity: DeepPartial<ProductEntity>): Promise<ProductEntity> {
    return this.productsOrmRepository.save(entity);
  }

  insert(data: QueryDeepPartialEntity<ProductEntity>): Promise<InsertResult> {
    return this.productsOrmRepository.insert(data);
  }

  update(
    where: FindOptionsWhere<ProductEntity>,
    data: QueryDeepPartialEntity<ProductEntity>,
  ): Promise<UpdateResult> {
    return this.productsOrmRepository.update(where, data);
  }

  delete(where: FindOptionsWhere<ProductEntity>): Promise<DeleteResult> {
    return this.productsOrmRepository.delete(where);
  }

  count(options?: FindManyOptions<ProductEntity>): Promise<number> {
    return this.productsOrmRepository.count(options);
  }

  exists(id: string): Promise<boolean> {
    return this.productsOrmRepository.exists({ where: { id } });
  }

  existsBy(where: FindOptionsWhere<ProductEntity>): Promise<boolean> {
    return this.productsOrmRepository.existsBy(where);
  }

  remove(entity: ProductEntity): Promise<ProductEntity> {
    return this.productsOrmRepository.remove(entity);
  }
}
