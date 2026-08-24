import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './entities/product.entity';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductsRepository>;

  const baseProduct = new ProductEntity({
    id: 'product-1',
    name: 'Orbit Chair',
    slug: 'orbit-chair',
    description: 'Compact lounge chair',
    price: 249.99,
    imageUrl: 'https://images.example/orbit-chair.jpg',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductsRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a product when slug is unique', async () => {
    const dto: CreateProductDto = {
      name: 'Orbit Chair',
      slug: 'orbit-chair',
      description: 'Compact lounge chair',
      price: 249.99,
      imageUrl: 'https://images.example/orbit-chair.jpg',
    };

    repository.findBySlug.mockResolvedValue(null);
    repository.create.mockResolvedValue(baseProduct);

    await expect(service.create(dto)).resolves.toEqual({
      id: baseProduct.id,
      name: baseProduct.name,
      slug: baseProduct.slug,
      description: baseProduct.description,
      price: baseProduct.price,
      imageUrl: baseProduct.imageUrl,
      createdAt: baseProduct.createdAt,
      updatedAt: baseProduct.updatedAt,
    });
    expect(repository.findBySlug).toHaveBeenCalledWith(dto.slug);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
      }),
    );
  });

  it('throws conflict when creating a duplicate slug', async () => {
    repository.findBySlug.mockResolvedValue(baseProduct);

    await expect(
      service.create({
        name: 'Duplicate Orbit Chair',
        slug: 'orbit-chair',
        description: 'Compact lounge chair',
        price: 249.99,
        imageUrl: 'https://images.example/orbit-chair.jpg',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns one product by id', async () => {
    repository.findById.mockResolvedValue(baseProduct);

    await expect(service.findOne(baseProduct.id)).resolves.toEqual({
      id: baseProduct.id,
      name: baseProduct.name,
      slug: baseProduct.slug,
      description: baseProduct.description,
      price: baseProduct.price,
      imageUrl: baseProduct.imageUrl,
      createdAt: baseProduct.createdAt,
      updatedAt: baseProduct.updatedAt,
    });
  });

  it('throws not found when a product does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a product with partial fields', async () => {
    const dto: UpdateProductDto = {
      price: 199.99,
    };
    const updatedProduct = new ProductEntity({
      ...baseProduct,
      price: 199.99,
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    repository.findById.mockResolvedValue(baseProduct);
    repository.update.mockResolvedValue(updatedProduct);

    await expect(service.update(baseProduct.id, dto)).resolves.toEqual({
      id: updatedProduct.id,
      name: updatedProduct.name,
      slug: updatedProduct.slug,
      description: updatedProduct.description,
      price: updatedProduct.price,
      imageUrl: updatedProduct.imageUrl,
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt,
    });
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: baseProduct.id,
        price: dto.price,
      }),
    );
  });

  it('throws conflict when updating to an existing slug', async () => {
    const conflictingProduct = new ProductEntity({
      ...baseProduct,
      id: 'product-2',
      slug: 'luna-desk',
    });

    repository.findById.mockResolvedValue(baseProduct);
    repository.findBySlug.mockResolvedValue(conflictingProduct);

    await expect(
      service.update(baseProduct.id, {
        slug: 'luna-desk',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('removes an existing product', async () => {
    repository.findById.mockResolvedValue(baseProduct);
    repository.remove.mockResolvedValue(baseProduct);

    await expect(service.remove(baseProduct.id)).resolves.toEqual({
      id: baseProduct.id,
      name: baseProduct.name,
      slug: baseProduct.slug,
      description: baseProduct.description,
      price: baseProduct.price,
      imageUrl: baseProduct.imageUrl,
      createdAt: baseProduct.createdAt,
      updatedAt: baseProduct.updatedAt,
    });
    expect(repository.remove).toHaveBeenCalledWith(baseProduct.id);
  });

  it('returns one product by slug', async () => {
    repository.findBySlug.mockResolvedValue(baseProduct);

    await expect(service.findOneBySlug(baseProduct.slug)).resolves.toEqual({
      id: baseProduct.id,
      name: baseProduct.name,
      slug: baseProduct.slug,
      description: baseProduct.description,
      price: baseProduct.price,
      imageUrl: baseProduct.imageUrl,
      createdAt: baseProduct.createdAt,
      updatedAt: baseProduct.updatedAt,
    });
  });
});
