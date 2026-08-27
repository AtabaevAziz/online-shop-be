# Online Shop Backend

Minimal NestJS backend for the online shop demo. The request flow is intentionally explicit:

`HTTP Request -> Middleware -> JWT/Guard -> Controller -> RequestDTO -> Service -> Entity -> Repository -> DB -> Entity -> ResponseDTO -> HTTP Response`

## What is implemented

- `RequestContextMiddleware`
  - adds `X-Request-Id`
  - logs method, path, status code, and elapsed time
- `ProtectedRouteAuthHeaderMiddleware`
  - checks `Authorization: Bearer ...` on protected write routes before guards run
- `POST /auth/login`
  - returns a bearer token for one env-configured admin user
- `JwtAuthGuard`
  - validates the bearer token and attaches the auth payload to the request
- `RolesGuard`
  - allows only the `admin` role on product write routes
- `RequestTimeoutInterceptor`
  - returns `408 Request Timeout` after 5 seconds
- `products` module
  - demonstrates the full `DTO -> Service -> Entity -> Repository(TypeORM)` CRUD flow

## Routes

Public routes:

- `GET /products`
- `GET /products/:id`
- `GET /products/slug/:slug`

Protected routes:

- `POST /products`
- `PATCH /products/:id`
- `DELETE /products/:id`

Auth route:

- `POST /auth/login`

## Environment

Create `.env` from the example file:

```bash
cp .env.example .env
```

Variables used by the backend:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=online_shop

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h

AUTH_ADMIN_USERNAME=admin
AUTH_ADMIN_PASSWORD=super-secret
```

## Database setup

The backend expects PostgreSQL.

Before starting the app:

1. PostgreSQL must already be running.
2. The database named in `DB_NAME` must already exist.

`synchronize: true` can create or update tables, but it does not create the database itself.

## Run

Install dependencies:

```bash
npm install
```

Start in development mode:

```bash
npm run start:dev
```

Other available commands:

- `npm run start`
- `npm run start:debug`
- `npm run start:prod`
- `npm run build`
- `npm run format`
- `npm run lint`
- `npm test`
- `npm run test:watch`
- `npm run test:cov`
- `npm run test:debug`
- `npm run test:e2e`

## Request flow

1. The client sends JSON to a controller route.
2. Nest validation transforms the request body into `CreateProductDto` or `UpdateProductDto`.
3. Middleware runs before the controller.
4. Protected write routes also pass through the auth and roles guards.
5. The controller delegates work to `ProductsService`.
6. The service applies business rules and maps DTO data into `ProductEntity`.
7. `ProductsRepository` calls TypeORM repository methods.
8. TypeORM persists or loads entity data from PostgreSQL.
9. The service maps the resulting entity into `ProductResponseDto`.
10. The controller returns JSON to the client.

## API examples

Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"super-secret"}'
```

Get all products:

```bash
curl http://localhost:3000/products
```

Get one product by slug:

```bash
curl http://localhost:3000/products/slug/orbit-chair
```

Create a product:

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "name": "Orbit Chair",
    "slug": "orbit-chair",
    "description": "Compact lounge chair",
    "price": 249.99,
    "imageUrl": "https://images.example/orbit-chair.jpg"
  }'
```

Update a product:

```bash
curl -X PATCH http://localhost:3000/products/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "price": 199.99
  }'
```

Delete a product:

```bash
curl -X DELETE http://localhost:3000/products/<id> \
  -H "Authorization: Bearer <accessToken>"
```

## TypeORM in this project

The `products` module keeps ORM usage explicit:

- `find()` loads all products
- `findOne(id)` loads one product by id
- `findOneBy({ slug })` loads one product by conditions
- `create(data)` creates an entity object without writing to the database
- `preload(data)` prepares an existing entity for update
- `save(entity)` inserts or updates a row
- `remove(entity)` deletes an entity instance

The custom `ProductsRepository` wraps the TypeORM repository so the service stays focused on validation, conflicts, and DTO mapping.

## SQL cheat sheet

The current entity maps to a `products` table with these field names:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  "imageUrl" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);
```

Read all products:

```sql
SELECT * FROM products;
```

Read one product by id:

```sql
SELECT * FROM products
WHERE id = 'product-id';
```

Read one product by slug:

```sql
SELECT * FROM products
WHERE slug = 'orbit-chair';
```

Insert a product:

```sql
INSERT INTO products (id, name, slug, description, price, "imageUrl", "createdAt", "updatedAt")
VALUES (
  'generated-uuid',
  'Orbit Chair',
  'orbit-chair',
  'Compact lounge chair',
  249.99,
  'https://images.example/orbit-chair.jpg',
  NOW(),
  NOW()
);
```

Update a product:

```sql
UPDATE products
SET price = 199.99,
    "updatedAt" = NOW()
WHERE id = 'product-id';
```

Delete a product:

```sql
DELETE FROM products
WHERE id = 'product-id';
```

Count products:

```sql
SELECT COUNT(*) FROM products;
```

TypeORM to SQL mapping:

- `find()` is the ORM-level equivalent of `SELECT *`
- `findOneBy({ slug })` is the ORM-level equivalent of `SELECT ... WHERE slug = ...`
- `save(entity)` can translate to `INSERT` or `UPDATE`
- `remove(entity)` maps to `DELETE`

## Tests

Unit and e2e tests are already present in the repository.

Documented test commands:

- `npm test`
- `npm run test:watch`
- `npm run test:cov`
- `npm run test:debug`
- `npm run test:e2e`
