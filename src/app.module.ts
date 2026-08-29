import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { ProtectedRouteAuthHeaderMiddleware } from './common/middleware/protected-route-auth-header.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { ProductsController } from './products/products.controller';
import { ProductsModule } from './products/products.module';

function formatConnectionOption(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString('utf8');
  }

  return 'unknown';
}

function readConnectionOption(options: DataSourceOptions, key: string): string {
  const optionValue: unknown = options;

  if (typeof optionValue !== 'object' || optionValue === null) {
    return 'unknown';
  }

  const optionMap = optionValue as Record<string, unknown>;

  if (!(key in optionMap)) {
    return 'unknown';
  }

  return formatConnectionOption(optionMap[key]);
}

function getConnectionDetails(options: DataSourceOptions): string {
  const username = readConnectionOption(options, 'username');
  const host = readConnectionOption(options, 'host');
  const port = readConnectionOption(options, 'port');
  const database = readConnectionOption(options, 'database');

  return `${username}@${host}:${port}/${database}`;
}

function buildDatabaseConfig(
  configService: ConfigService,
): TypeOrmModuleOptions {
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
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildDatabaseConfig(configService),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('TypeORM data source options were not provided');
        }

        try {
          return await new DataSource(options).initialize();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          const details = getConnectionDetails(options);

          throw new Error(
            `Failed to connect to PostgreSQL with DB config ${details}: ${message}`,
            { cause: error },
          );
        }
      },
    }),

    AuthModule,
    ProductsModule,
  ],
})
export class AppModule implements NestModule {
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
