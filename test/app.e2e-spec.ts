import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { LoginResponseDto } from '../src/auth/dto/login-response.dto';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtTokenService } from '../src/auth/jwt-token.service';
import { RequestTimeoutInterceptor } from '../src/common/interceptors/request-timeout.interceptor';
import { ProtectedRouteAuthHeaderMiddleware } from '../src/common/middleware/protected-route-auth-header.middleware';
import { RequestContextMiddleware } from '../src/common/middleware/request-context.middleware';
import { CreateProductDto } from '../src/products/dto/create-product.dto';
import { ProductEntity } from '../src/products/entities/product.entity';
import { ProductsController } from '../src/products/products.controller';
import { ProductsRepository } from '../src/products/products.repository';
import { ProductsService } from '../src/products/products.service';

interface ProductResponseBody {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

const products = new Map<string, ProductEntity>();
let sequence = 1;

function sortProductsByCreatedAtDesc(items: ProductEntity[]): ProductEntity[] {
  return [...items].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertIsLoginResponseBody(
  value: unknown,
  expectedRole: 'admin' | 'user',
): asserts value is LoginResponseDto {
  if (!isRecord(value)) {
    throw new Error('Expected login response body to be an object');
  }

  if (typeof value.accessToken !== 'string') {
    throw new Error('Expected accessToken to be a string');
  }

  if (value.tokenType !== 'Bearer') {
    throw new Error('Expected tokenType to be Bearer');
  }

  if (typeof value.expiresIn !== 'string') {
    throw new Error('Expected expiresIn to be a string');
  }

  if (value.role !== expectedRole) {
    throw new Error(`Expected role to be ${expectedRole}`);
  }
}

function assertIsProductResponseBody(
  value: unknown,
): asserts value is ProductResponseBody {
  if (!isRecord(value)) {
    throw new Error('Expected product response body to be an object');
  }

  if (typeof value.id !== 'string') {
    throw new Error('Expected product id to be a string');
  }

  if (typeof value.name !== 'string') {
    throw new Error('Expected product name to be a string');
  }

  if (typeof value.slug !== 'string') {
    throw new Error('Expected product slug to be a string');
  }

  if (typeof value.description !== 'string') {
    throw new Error('Expected product description to be a string');
  }

  if (typeof value.price !== 'number') {
    throw new Error('Expected product price to be a number');
  }

  if (typeof value.imageUrl !== 'string') {
    throw new Error('Expected product imageUrl to be a string');
  }

  if (typeof value.createdAt !== 'string') {
    throw new Error('Expected product createdAt to be a string');
  }

  if (typeof value.updatedAt !== 'string') {
    throw new Error('Expected product updatedAt to be a string');
  }
}

function findProductByWhere(
  where: Partial<ProductEntity>,
): ProductEntity | null {
  return (
    Array.from(products.values()).find((product) =>
      Object.entries(where).every(
        ([key, value]) => product[key as keyof ProductEntity] === value,
      ),
    ) ?? null
  );
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [
        () => ({
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '1h',
          AUTH_ADMIN_USERNAME: 'admin',
          AUTH_ADMIN_PASSWORD: 'super-secret',
          AUTH_DEMO_USERNAME: 'user',
          AUTH_DEMO_PASSWORD: 'user-secret',
        }),
      ],
    }),
  ],
  controllers: [AuthController, ProductsController],
  providers: [
    AuthService,
    JwtTokenService,
    JwtAuthGuard,
    RolesGuard,
    Reflector,
    RequestContextMiddleware,
    ProtectedRouteAuthHeaderMiddleware,
    ProductsService,
    {
      provide: ProductsRepository,
      useValue: {
        find: jest.fn(() =>
          Promise.resolve(
            sortProductsByCreatedAtDesc(Array.from(products.values())),
          ),
        ),
        findOne: jest.fn((id: string) =>
          Promise.resolve(products.get(id) ?? null),
        ),
        findOneBy: jest.fn((where: Partial<ProductEntity>) =>
          Promise.resolve(findProductByWhere(where)),
        ),
        findBy: jest.fn((where: Partial<ProductEntity>) =>
          Promise.resolve(
            Array.from(products.values()).filter((product) =>
              Object.entries(where).every(
                ([key, value]) => product[key as keyof ProductEntity] === value,
              ),
            ),
          ),
        ),
        create: jest.fn(
          (entity: Partial<ProductEntity>) => new ProductEntity(entity),
        ),
        preload: jest.fn((entity: Partial<ProductEntity>) => {
          if (!entity.id) {
            return Promise.resolve(undefined);
          }

          const current = products.get(entity.id);
          if (!current) {
            return Promise.resolve(undefined);
          }

          return Promise.resolve(
            new ProductEntity({
              ...current,
              ...entity,
            }),
          );
        }),
        save: jest.fn((entity: Partial<ProductEntity>) => {
          const timestamp = new Date('2026-08-24T00:00:00.000Z');

          if (!entity.id) {
            const created = new ProductEntity({
              ...entity,
              id: `product-${sequence++}`,
              createdAt: timestamp,
              updatedAt: timestamp,
            });
            products.set(created.id, created);
            return Promise.resolve(created);
          }

          const current = products.get(entity.id);
          const updated = new ProductEntity({
            ...current,
            ...entity,
            updatedAt: timestamp,
          });
          products.set(updated.id, updated);
          return Promise.resolve(updated);
        }),
        remove: jest.fn((entity: ProductEntity) => {
          const current = products.get(entity.id);
          if (!current) {
            throw new Error('Product not found');
          }
          products.delete(entity.id);
          return Promise.resolve(current);
        }),
      },
    },
  ],
})
class TestApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes(AuthController, ProductsController);
    consumer
      .apply(ProtectedRouteAuthHeaderMiddleware)
      .forRoutes(
        { path: 'products', method: RequestMethod.POST },
        { path: 'products/:id', method: RequestMethod.PATCH },
        { path: 'products/:id', method: RequestMethod.DELETE },
      );
  }
}

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestApiModule],
    }).compile();

    products.clear();
    sequence = 1;
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new RequestTimeoutInterceptor());
    await app.init();
  });

  it('issues a bearer token for valid login credentials', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'super-secret',
      })
      .expect(201);

    const loginBody: unknown = loginResponse.body;
    assertIsLoginResponseBody(loginBody, 'admin');

    expect(loginBody.accessToken).not.toHaveLength(0);
    expect(loginBody.tokenType).toBe('Bearer');
    expect(loginBody.expiresIn).toBe('1h');
    expect(loginBody.role).toBe('admin');
    expect(loginResponse.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('issues a bearer token for valid demo user credentials', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'user',
        password: 'user-secret',
      })
      .expect(201);

    const loginBody: unknown = loginResponse.body;
    assertIsLoginResponseBody(loginBody, 'user');

    expect(loginBody.role).toBe('user');
    expect(loginResponse.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('keeps product read routes public', async () => {
    const seededProduct = new ProductEntity({
      id: 'product-1',
      name: 'Orbit Chair',
      slug: 'orbit-chair',
      description: 'Compact lounge chair',
      price: 249.99,
      imageUrl: 'https://images.example/orbit-chair.jpg',
      createdAt: new Date('2026-08-24T00:00:00.000Z'),
      updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    });
    products.set(seededProduct.id, seededProduct);

    const listResponse = await request(app.getHttpServer())
      .get('/products')
      .expect(200);
    expect(listResponse.body).toEqual([
      expect.objectContaining({
        id: seededProduct.id,
        slug: 'orbit-chair',
      }),
    ]);
    expect(listResponse.headers['x-request-id']).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get('/products/slug/orbit-chair')
      .expect(200);
    await request(app.getHttpServer()).get('/products/product-1').expect(200);
  });

  it('returns 401 for protected write routes without a bearer token', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Orbit Chair',
        slug: 'orbit-chair',
        description: 'Compact lounge chair',
        price: 249.99,
        imageUrl: 'https://images.example/orbit-chair.jpg',
      })
      .expect(401);
  });

  it('returns 403 for protected write routes when the role is not admin', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'user',
        password: 'user-secret',
      })
      .expect(201);
    const loginBody: unknown = loginResponse.body;
    assertIsLoginResponseBody(loginBody, 'user');
    const nonAdminToken = loginBody.accessToken;

    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send({
        name: 'Orbit Chair',
        slug: 'orbit-chair',
        description: 'Compact lounge chair',
        price: 249.99,
        imageUrl: 'https://images.example/orbit-chair.jpg',
      })
      .expect(403);
  });

  it('returns 401 for protected write routes when the jwt is invalid', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        name: 'Orbit Chair',
        slug: 'orbit-chair',
        description: 'Compact lounge chair',
        price: 249.99,
        imageUrl: 'https://images.example/orbit-chair.jpg',
      })
      .expect(401);
  });

  it('creates, updates, and removes products with an admin bearer token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'super-secret',
      })
      .expect(201);
    const loginBody: unknown = loginResponse.body;
    assertIsLoginResponseBody(loginBody, 'admin');
    const accessToken = loginBody.accessToken;

    const createResponse = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Orbit Chair',
        slug: 'orbit-chair',
        description: 'Compact lounge chair',
        price: 249.99,
        imageUrl: 'https://images.example/orbit-chair.jpg',
      })
      .expect(201);
    const createBody: unknown = createResponse.body;
    assertIsProductResponseBody(createBody);
    const productId = createBody.id;

    const updatePayload: Partial<CreateProductDto> = {
      price: 199.99,
    };

    const updateResponse = await request(app.getHttpServer())
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updatePayload)
      .expect(200);
    const updateBody: unknown = updateResponse.body;
    assertIsProductResponseBody(updateBody);
    expect(updateBody.id).toBe(productId);
    expect(updateBody.price).toBe(199.99);

    const detailResponse = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .expect(200);
    const detailBody: unknown = detailResponse.body;
    assertIsProductResponseBody(detailBody);
    expect(detailBody.id).toBe(productId);
    expect(detailBody.slug).toBe('orbit-chair');
    expect(detailBody.price).toBe(199.99);

    const slugResponse = await request(app.getHttpServer())
      .get('/products/slug/orbit-chair')
      .expect(200);
    const slugBody: unknown = slugResponse.body;
    assertIsProductResponseBody(slugBody);
    expect(slugBody.id).toBe(productId);
    expect(slugBody.slug).toBe('orbit-chair');

    await request(app.getHttpServer())
      .delete(`/products/${productId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .expect(404);
  });

  it('returns 408 for the demo timeout route', async () => {
    await request(app.getHttpServer())
      .get('/products/demo/timeout')
      .expect(408);
  }, 10_000);

  afterEach(async () => {
    await app.close();
  });
});
