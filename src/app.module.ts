import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { ProtectedRouteAuthHeaderMiddleware } from './common/middleware/protected-route-auth-header.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { ProductsController } from './products/products.controller';
import { ProductsModule } from './products/products.module';

function buildDatabaseConfig(configService: ConfigService): TypeOrmModuleOptions {
  const host = configService.get<string>('DB_HOST') ?? 'localhost';
  const portValue = configService.get<string>('DB_PORT') ?? '5432';
  const username = configService.get<string>('DB_USERNAME') ?? 'postgres';
  const password = configService.get<string>('DB_PASSWORD') ?? 'postgres';
  const database = configService.get<string>('DB_NAME') ?? 'online_shop';
  const port = Number(portValue);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid DB_PORT value: "${portValue}"`);
  }

  return {
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    autoLoadEntities: true,
    synchronize: true,
    retryAttempts: 0,
    retryDelay: 0,
    dataSourceFactory: async (options) => {
      try {
        return await new DataSource(options).initialize();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to connect to PostgreSQL with DB config ${username}@${host}:${port}/${database}: ${message}`,
        );
      }
    },
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => buildDatabaseConfig(configService),
    }),

    AuthModule,
    ProductsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes(AuthController, ProductsController);
    consumer.apply(ProtectedRouteAuthHeaderMiddleware).forRoutes(
      { path: 'products', method: RequestMethod.POST },
      { path: 'products/:id', method: RequestMethod.PATCH },
      { path: 'products/:id', method: RequestMethod.DELETE },
    );
  }
}
