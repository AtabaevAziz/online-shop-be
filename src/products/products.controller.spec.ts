import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  const productsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    demoTimeout: jest.fn(),
    findOne: jest.fn(),
    findOneBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: productsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates create to the service', async () => {
    const dto: CreateProductDto = {
      name: 'Orbit Chair',
      slug: 'orbit-chair',
      description: 'Compact lounge chair',
      price: 249.99,
      imageUrl: 'https://images.example/orbit-chair.jpg',
    };
    const response: ProductResponseDto = {
      id: 'product-1',
      ...dto,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    productsService.create.mockResolvedValue(response);

    await expect(controller.create(dto)).resolves.toEqual(response);
    expect(productsService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findAll to the service', async () => {
    productsService.findAll.mockResolvedValue([]);

    await expect(controller.findAll()).resolves.toEqual([]);
    expect(productsService.findAll).toHaveBeenCalled();
  });

  it('delegates demoTimeout to the service', async () => {
    productsService.demoTimeout.mockResolvedValue({
      status: 'completed',
      waitedMs: 6000,
    });

    await expect(controller.demoTimeout()).resolves.toEqual({
      status: 'completed',
      waitedMs: 6000,
    });
    expect(productsService.demoTimeout).toHaveBeenCalled();
  });

  it('delegates findOne to the service', async () => {
    const response = {
      id: 'product-1',
      name: 'Orbit Chair',
      slug: 'orbit-chair',
      description: 'Compact lounge chair',
      price: 249.99,
      imageUrl: 'https://images.example/orbit-chair.jpg',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    productsService.findOne.mockResolvedValue(response);

    await expect(controller.findOne('product-1')).resolves.toEqual(response);
    expect(productsService.findOne).toHaveBeenCalledWith('product-1');
  });

  it('delegates findOneBySlug to the service', async () => {
    const response = {
      id: 'product-1',
      name: 'Orbit Chair',
      slug: 'orbit-chair',
      description: 'Compact lounge chair',
      price: 249.99,
      imageUrl: 'https://images.example/orbit-chair.jpg',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    productsService.findOneBySlug.mockResolvedValue(response);

    await expect(controller.findOneBySlug('orbit-chair')).resolves.toEqual(
      response,
    );
    expect(productsService.findOneBySlug).toHaveBeenCalledWith('orbit-chair');
  });

  it('delegates update to the service', async () => {
    const dto: UpdateProductDto = {
      price: 199.99,
    };
    const response = {
      id: 'product-1',
      name: 'Orbit Chair',
      slug: 'orbit-chair',
      description: 'Compact lounge chair',
      price: 199.99,
      imageUrl: 'https://images.example/orbit-chair.jpg',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    productsService.update.mockResolvedValue(response);

    await expect(controller.update('product-1', dto)).resolves.toEqual(
      response,
    );
    expect(productsService.update).toHaveBeenCalledWith('product-1', dto);
  });

  it('delegates remove to the service', async () => {
    const response = {
      id: 'product-1',
      name: 'Orbit Chair',
      slug: 'orbit-chair',
      description: 'Compact lounge chair',
      price: 249.99,
      imageUrl: 'https://images.example/orbit-chair.jpg',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    productsService.remove.mockResolvedValue(response);

    await expect(controller.remove('product-1')).resolves.toEqual(response);
    expect(productsService.remove).toHaveBeenCalledWith('product-1');
  });
});
