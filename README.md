# Online Shop Backend

Minimal NestJS backend for the online shop demo. The request flow is intentionally explicit:

`JSON -> DTO -> Service -> Entity -> Repository -> SQL -> ResponseDTO -> JSON`

The frontend learning page at `/learn` uses this backend as its real example chain.

The core beginner version of the same idea is:

`HTTP Request with JSON -> Controller -> RequestDTO -> Service -> Entity -> Repository/ORM -> SQL -> DB -> Entity -> Service -> ResponseDTO -> Controller -> HTTP Response with JSON`

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

## Cheat sheet

Backend flow:

`JSON -> DTO -> Service -> Entity -> Repository -> SQL -> ResponseDTO -> JSON`

Access flow:

`Request -> Middleware -> JWT -> Guard -> Controller -> Timeout`

SQL <-> TypeORM:

- `find()` -> `SELECT`
- `findOneBy({ slug })` -> `SELECT ... WHERE slug = ...`
- `save(entity)` -> `INSERT` or `UPDATE`
- `remove(entity)` -> `DELETE`
- `create(data)` -> build an entity in memory only

Term meanings:

- `Middleware` -> code that works on the request before the controller
- `JWT token` -> token that identifies the client after login
- `Guard` -> code that allows or denies an action
- `Timeout` -> the maximum wait time for a request

School analogies:

- `Middleware` -> like the duty teacher at the entrance
- `JWT token` -> like a school pass card
- `Guard` -> like a guard at the classroom door
- `Timeout` -> like stopping the wait after 5 seconds

## Full-stack learning order

Use this order when explaining the project from frontend to backend:

1. `Component` -> UI block that renders ready data
2. `Page` -> collects data and passes props to components
3. `Fetch / API call` -> asks the backend for JSON
4. `Controller` -> receives HTTP request
5. `DTO` -> validates request shape or defines response shape
6. `Service` -> applies business rules
7. `Repository` -> calls TypeORM methods
8. `Entity` -> maps fields to table columns
9. `SQL` -> database language behind ORM
10. `JSON response` -> data returns to the frontend

In this repo, the DTO part is represented by `CreateProductDto`, `UpdateProductDto`, and `ProductResponseDto`.

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

The example file contains all variables used by the backend:

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

For the default local settings in `.env.example`:

```bash
createdb -h localhost -p 5432 -U postgres online_shop
```

If `createdb` is not available, use `psql` instead:

```bash
psql -h localhost -p 5432 -U postgres -d postgres \
  -c "CREATE DATABASE online_shop;"
```

`synchronize: true` can create or update tables, but it does not create the database itself.

## Run

Install dependencies:

```bash
npm install
```

Create the database if you have not already:

```bash
createdb -h localhost -p 5432 -U postgres online_shop
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

Short version:

`Request -> Middleware -> JWT/Guard -> Controller -> DTO -> Service -> Repository -> DB -> Response`

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
- `findBy(where)` loads several products by conditions
- `create(data)` creates an entity object without writing to the database
- `preload(data)` prepares an existing entity for update
- `save(entity)` inserts or updates a row
- `insert(data)` inserts rows directly
- `update(where, data)` updates rows directly
- `delete(where)` deletes rows directly
- `count()` counts rows
- `exists(id)` and `existsBy(where)` check whether rows exist
- `remove(entity)` deletes an entity instance

The custom `ProductsRepository` wraps the TypeORM repository so the service stays focused on validation, conflicts, and DTO mapping.

## SQL cheat sheet

The current entity maps to a `products` table with these field names:

```
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

```
SELECT * FROM products;
```

Read one product by id:

```
SELECT * FROM products
WHERE id = 'product-id';
```

Read one product by slug:

```
SELECT * FROM products
WHERE slug = 'orbit-chair';
```

Insert a product:

```
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

```
UPDATE products
SET price = 199.99,
    "updatedAt" = NOW()
WHERE id = 'product-id';
```

Delete a product:

```
DELETE FROM products
WHERE id = 'product-id';
```

Count products:

```
SELECT COUNT(*) FROM products;
```

TypeORM to SQL mapping:

- `find()` is the ORM-level equivalent of `SELECT *`
- `findOneBy({ slug })` is the ORM-level equivalent of `SELECT ... WHERE slug = ...`
- `save(entity)` can translate to `INSERT` or `UPDATE`
- `remove(entity)` maps to `DELETE`
- `count()` maps to `SELECT COUNT(*)`

## Beginner SQL example

Use a simple `users` table to explain SQL before mapping it back to `products`:

```
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  age INTEGER,
  city VARCHAR(100)
);
```

Minimal learning queries:

- `SELECT * FROM users;` -> get data
- `SELECT * FROM users WHERE age >= 18;` -> get data by condition
- `INSERT INTO users (name, age, city) VALUES ('Tom', 16, 'Tashkent');` -> add data
- `UPDATE users SET age = 16 WHERE id = 1;` -> change data
- `DELETE FROM users WHERE id = 3;` -> remove data
- `SELECT * FROM users ORDER BY age DESC LIMIT 2;` -> sort and limit
- `SELECT * FROM users WHERE name LIKE 'A%';` -> simple text search
- `SELECT COUNT(*) FROM users WHERE city = 'Tashkent';` -> count matching rows

Important warning:

- `UPDATE users SET age = 16;` changes every row
- `DELETE FROM users;` removes every row

Why two examples exist:

- `users` is the simple learning table
- `products` is the real project table

## Tests

Unit and e2e tests are already present in the repository.

Documented test commands:

- `npm test`
- `npm run test:watch`
- `npm run test:cov`
- `npm run test:debug`
- `npm run test:e2e`
