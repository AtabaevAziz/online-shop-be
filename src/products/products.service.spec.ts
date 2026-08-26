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
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      preload: jest.fn(),
      save: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      existsBy: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<ProductsRepository>;

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

    repository.findOneBy.mockResolvedValue(null);
    repository.create.mockReturnValue(baseProduct);
    repository.save.mockResolvedValue(baseProduct);

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
    expect(repository.findOneBy).toHaveBeenCalledWith({ slug: dto.slug });
    expect(repository.create).toHaveBeenCalledWith({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      price: dto.price,
      imageUrl: dto.imageUrl,
    });
    expect(repository.save).toHaveBeenCalledWith(baseProduct);
  });

  it('throws conflict when creating a duplicate slug', async () => {
    repository.findOneBy.mockResolvedValue(baseProduct);

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
    repository.findOne.mockResolvedValue(baseProduct);

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

  it('returns all products', async () => {
    repository.find.mockResolvedValue([baseProduct]);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: baseProduct.id,
        name: baseProduct.name,
        slug: baseProduct.slug,
        description: baseProduct.description,
        price: baseProduct.price,
        imageUrl: baseProduct.imageUrl,
        createdAt: baseProduct.createdAt,
        updatedAt: baseProduct.updatedAt,
      },
    ]);
    expect(repository.find).toHaveBeenCalled();
  });

  it('throws not found when a product does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

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

    repository.findOne.mockResolvedValue(baseProduct);
    repository.preload.mockResolvedValue(updatedProduct);
    repository.save.mockResolvedValue(updatedProduct);

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
    expect(repository.preload).toHaveBeenCalledWith(
      expect.objectContaining({
        id: baseProduct.id,
        price: dto.price,
      }),
    );
    expect(repository.save).toHaveBeenCalledWith(updatedProduct);
  });

  it('throws conflict when updating to an existing slug', async () => {
    const conflictingProduct = new ProductEntity({
      ...baseProduct,
      id: 'product-2',
      slug: 'luna-desk',
    });

    repository.findOne.mockResolvedValue(baseProduct);
    repository.findOneBy.mockResolvedValue(conflictingProduct);

    await expect(
      service.update(baseProduct.id, {
        slug: 'luna-desk',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('removes an existing product', async () => {
    repository.findOne.mockResolvedValue(baseProduct);
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
    expect(repository.remove).toHaveBeenCalledWith(baseProduct);
  });

  it('returns one product by slug', async () => {
    repository.findOneBy.mockResolvedValue(baseProduct);

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
    expect(repository.findOneBy).toHaveBeenCalledWith({ slug: baseProduct.slug });
  });

  it('throws not found when a slug does not exist', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOneBySlug('missing-slug')).rejects.toBeInstanceOf(NotFoundException);
  });
});
