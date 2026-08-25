import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { ProtectedRouteAuthHeaderMiddleware } from './common/middleware/protected-route-auth-header.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { ProductsController } from './products/products.controller';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
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
