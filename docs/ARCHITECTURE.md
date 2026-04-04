# Backend API Architecture

The backend is a robust Node.js/Express API designed for high-performance and clear separation of concerns.

## 📁 Key Folders

- `/src/routes`: API route definitions, organized by version (e.g., `v2`).
- `/src/controllers`: Request handlers that bridge routes and services.
- `/src/services`: Business logic layer (database interactions, complex calculations).
- `/src/models`: Database schema definitions (Mongoose models).
- `/src/validation`: Zod schemas for validating request payloads.
- `/src/docs`: OpenAPI/Swagger documentation files (`.yml`).

## 🏗️ Core Patterns

### 1. Route-Controller-Service Separation

We strictly follow a three-tier architecture:

1. **Route**: Defines the path and applies middleware (Auth, Validation).
2. **Controller**: Extracts data from requests and calls the appropriate service. Handles HTTP responses.
3. **Service**: Contains the core logic. Interacts with the database.

### 2. Validation with Zod

All incoming data is validated using **Zod**.

- Validation is applied as middleware in the route files.
- Schemas are reusable and serve as a "Source of Truth" for the API contracts.

### 3. API Documentation

We use **Swagger/OpenAPI** to document the API.

- Documentation lives in `/src/docs`.
- Each module (e.g., `admin.user.doc.yml`) is combined into a master swagger file.

## 🔒 Authentication & Authorization

- **JWT**: Stateless authentication using Access and Refresh tokens.
- **Roles**: RBAC (Role-Based Access Control) defined in `src/config/roles.ts`.
- **Middleware**: `auth()` middleware is used to protect routes and enforce permissions.

## 🚀 Development Flow

1. **Define Schema**: Create a Zod validation schema in `src/validation`.
2. **Write Service**: Implement business logic in `src/services`.
3. **Create Controller**: Write the handler in `src/controllers`.
4. **Define Route**: Register the endpoint in `src/routes/v1/`.
5. **Document API**: Add OpenApi specs in `src/docs/v1/`.
