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

const products = new Map<string, ProductEntity>();
let sequence = 1;

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
})
class TestApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes(AuthController, ProductsController);
    consumer.apply(ProtectedRouteAuthHeaderMiddleware).forRoutes(
      { path: 'products', method: RequestMethod.POST },
      { path: 'products/:id', method: RequestMethod.PATCH },
      { path: 'products/:id', method: RequestMethod.DELETE },
    );
  }
}

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtTokenService: JwtTokenService;

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
    jwtTokenService = app.get(JwtTokenService);
  });

  it('issues a bearer token for valid login credentials', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'super-secret',
      })
      .expect(201);

    expect(loginResponse.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: '1h',
        role: 'admin',
      }),
    );
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

    const listResponse = await request(app.getHttpServer()).get('/products').expect(200);
    expect(listResponse.body).toEqual([
      expect.objectContaining({
        id: seededProduct.id,
        slug: 'orbit-chair',
      }),
    ]);
    expect(listResponse.headers['x-request-id']).toEqual(expect.any(String));

    await request(app.getHttpServer()).get('/products/slug/orbit-chair').expect(200);
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
    const nonAdminToken = jwtTokenService.sign({
      sub: 'student-1',
      username: 'vasya',
      role: 'student',
    });

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
    const accessToken = loginResponse.body.accessToken;

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

    const updatePayload: Partial<CreateProductDto> = {
      price: 199.99,
    };

    const updateResponse = await request(app.getHttpServer())
      .patch(`/products/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
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
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/products/${createResponse.body.id}`)
      .expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
