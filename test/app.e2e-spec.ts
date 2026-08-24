import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { CreateProductDto } from '../src/products/dto/create-product.dto';
import { ProductEntity } from '../src/products/entities/product.entity';
import { ProductsController } from '../src/products/products.controller';
import { ProductsRepository } from '../src/products/products.repository';
import { ProductsService } from '../src/products/products.service';

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;
  const products = new Map<string, ProductEntity>();
  let sequence = 1;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        {
          provide: ProductsRepository,
          useValue: {
            findById: jest.fn(async (id: string) => products.get(id) ?? null),
            findBySlug: jest.fn(
              async (slug: string) =>
                Array.from(products.values()).find((product) => product.slug === slug) ?? null,
            ),
            findAll: jest.fn(async () => Array.from(products.values())),
            create: jest.fn(async (entity: ProductEntity) => {
              const created = new ProductEntity({
                ...entity,
                id: `product-${sequence++}`,
                createdAt: new Date('2026-08-24T00:00:00.000Z'),
                updatedAt: new Date('2026-08-24T00:00:00.000Z'),
              });
              products.set(created.id, created);
              return created;
            }),
            update: jest.fn(async (entity: ProductEntity) => {
              const updated = new ProductEntity({
                ...entity,
                updatedAt: new Date('2026-08-24T00:00:00.000Z'),
              });
              products.set(updated.id, updated);
              return updated;
            }),
            remove: jest.fn(async (id: string) => {
              const current = products.get(id);
              if (!current) {
                throw new Error('Product not found');
              }
              products.delete(id);
              return current;
            }),
          },
        },
      ],
    }).compile();

    products.clear();
    sequence = 1;
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('creates, reads, updates, and removes products through the controller flow', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Orbit Chair',
        slug: 'orbit-chair',
        description: 'Compact lounge chair',
        price: 249.99,
        imageUrl: 'https://images.example/orbit-chair.jpg',
      })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'Orbit Chair',
        slug: 'orbit-chair',
        description: 'Compact lounge chair',
        price: 249.99,
        imageUrl: 'https://images.example/orbit-chair.jpg',
      }),
    );

    const listResponse = await request(app.getHttpServer()).get('/products').expect(200);
    expect(listResponse.body).toEqual([
      expect.objectContaining({
        id: createResponse.body.id,
        slug: 'orbit-chair',
      }),
    ]);

    const updatePayload: Partial<CreateProductDto> = {
      price: 199.99,
    };

    const updateResponse = await request(app.getHttpServer())
      .patch(`/products/${createResponse.body.id}`)
      .send(updatePayload)
      .expect(200);
    expect(updateResponse.body).toEqual(
      expect.objectContaining({
        id: createResponse.body.id,
        price: 199.99,
      }),
    );

    const detailResponse = await request(app.getHttpServer())
      .get(`/products/${createResponse.body.id}`)
      .expect(200);
    expect(detailResponse.body).toEqual(
      expect.objectContaining({
        id: createResponse.body.id,
        slug: 'orbit-chair',
        price: 199.99,
      }),
    );

    const slugResponse = await request(app.getHttpServer())
      .get('/products/slug/orbit-chair')
      .expect(200);
    expect(slugResponse.body).toEqual(
      expect.objectContaining({
        id: createResponse.body.id,
        slug: 'orbit-chair',
      }),
    );

    await request(app.getHttpServer())
      .delete(`/products/${createResponse.body.id}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/products/${createResponse.body.id}`)
      .expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
