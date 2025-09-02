# Coding Standards & Best Practices Guide for Cursor

To ensure the Ganpat University Bus Tracking System remains flexible, maintainable, and consistently high-quality, follow these coding standards and best practices throughout both frontend and backend codebases.

***

## 1. Project Organization & Structure

- **Feature-First Layout**  
  Organize files by feature or domain rather than by technical layer.  
  ```
  src/
  ├── auth/
  │   ├── login.tsx
  │   ├── register.ts
  │   └── authService.ts
  ├── tracking/
  │   ├── map/
  │   │   └── BusMap.tsx
  │   ├── websocket/
  │   │   └── socketClient.ts
  │   └── trackingService.ts
  ├── admin/
  │   ├── routes/
  │   └── drivers/
  └── shared/        # shared types, constants, utilities
      ├── types.ts
      └── utils.ts
  ```

- **One Responsibility per File**  
  Each file should export a single component, service, or utility. This simplifies imports and navigation.

***

## 2. TypeScript & Typing

- **Strict Typing**  
  Enable `"strict": true` in `tsconfig.json`. Avoid `any`.  
  Use `unknown` instead of `any` where appropriate, then narrow types explicitly.

- **Shared Types**  
  Centralize all interfaces and type definitions in a shared `types.ts`.  
  ```ts
  export interface BusLocation {
    busId: string;
    lat: number;
    lng: number;
    timestamp: string;
  }
  ```

- **DTOs & Schemas**  
  Validate external inputs via Zod or Joi schemas and infer TypeScript types.  
  ```ts
  const locationSchema = z.object({
    busId: z.string().uuid(),
    lat: z.number(),
    lng: z.number(),
    timestamp: z.string().transform(str => new Date(str)),
  });
  type LocationDto = z.infer<typeof locationSchema>;
  ```

***

## 3. Modular & Loosely Coupled Code

- **Dependency Injection**  
  Pass dependencies (e.g., database client, messaging client) into services rather than importing singletons.  
  ```ts
  class TrackingService {
    constructor(private db: DbClient, private broadcaster: Broadcaster) {}
  }
  ```

- **Interface-Based Contracts**  
  Define interfaces for services (e.g., `IAuthService`, `ITrackingService`) and program to those interfaces. This enables swapping implementations easily.

- **Clear Boundaries**  
  Keep WebSocket logic separate from REST controllers. Expose only minimal, well-defined methods.

***

## 4. Clean Code Principles

- **Function Size**  
  Keep functions under ~30 lines. If longer, split into smaller helpers.  

- **Descriptive Naming**  
  Use descriptive names for variables and functions.  
  ```ts
  // Good
  async function fetchActiveBusLocations(routeId: string): Promise<BusLocation[]> { ... }

  // Avoid
  async function getData(r: string): Promise<any> { ... }
  ```

- **Avoid Deep Nesting**  
  Return early to reduce nested conditionals.  
  ```ts
  if (!user) throw new NotFoundError();
  // proceed...
  ```

- **Single Level of Abstraction**  
  In a function, don’t mix high-level logic with low-level details. Delegate low-level tasks to helpers.

***

## 5. Error Handling & Logging

- **Centralized Error Types**  
  Define and throw custom error classes (`ValidationError`, `AuthError`, `DbError`).  

- **Middleware for Errors** (Backend)  
  Catch errors in Express/WebSocket handlers and transform to consistent HTTP or socket error responses.

- **Structured Logging**  
  Use a logging library (Pino or Winston) with structured JSON logs including timestamps, levels, and request context.

***

## 6. Testing & Coverage

- **Unit Tests**  
  - Test individual functions and services in isolation.  
  - Mock external dependencies via interfaces.

- **Integration Tests**  
  - Use an in-memory or test database for PostGIS queries.  
  - Test REST endpoints with Supertest.

- **E2E Tests**  
  - Use Cypress for critical user flows (login, live map updates, admin CRUD).

- **Coverage Threshold**  
  Enforce ≥80% coverage. Configure CI to fail on decreased coverage.

***

## 7. API Design & Documentation

- **OpenAPI Specification**  
  Maintain an `openapi.yaml` that describes all REST endpoints, request bodies, and responses. Regenerate on each API change.

- **Consistent URL Patterns**  
  Use plural nouns, versioning, and hierarchical routes:  
  ```
  GET   /api/v1/buses
  POST  /api/v1/routes
  PUT   /api/v1/drivers/:id/assign
  ```

- **HTTP Status Codes**  
  Use appropriate status codes: `400` for validation errors, `401` for auth, `404` for not found, `500` for server errors.

***

## 8. Frontend Best Practices

- **State Management**  
  - Use React Query or SWR for data fetching and caching.  
  - Use Zustand or Redux Toolkit for global state only when needed.

- **Component Design**  
  - Keep components small and presentational; encapsulate logic in custom hooks.  
  - Use hooks like `useBusLocations(routeId)` to centralize data logic.

- **Styling**  
  - Use Tailwind CSS utility classes.  
  - Create reusable design tokens (colors, spacing) in `tailwind.config.js`.

- **Performance**  
  - Lazy-load noncritical components with `React.lazy` and `Suspense`.  
  - Memoize expensive calculations with `useMemo` and `useCallback`.

***

## 9. Continuous Integration & Delivery

- **Automated Workflows**  
  - **Lint → Type Check → Test → Build** on every pull request.  
  - **Deploy** to staging on merge to `main`; to production on tagged releases.

- **Branching Strategy**  
  - Use feature branches for work.  
  - Require PR reviews and passing CI checks before merging.

- **Release Management**  
  - Follow semantic versioning.  
  - Tag releases and generate changelogs automatically.

***

## 10. Documentation & Onboarding

- **Code Comments**  
  - Write JSDoc/TSDoc comments for complex functions and exported interfaces.  

- **README & Wiki**  
  - Keep `README.md` up to date with setup, local development, and deployment instructions.  
  - Document architectural decisions and data models in `docs/`.

- **Pair Programming & Reviews**  
  - Encourage regular code reviews focusing on architecture, readability, and adherence to standards.  
  - Use pair programming sessions for critical features.

***

Adhering to these standards will keep the codebase **loose and extensible**, **easy to navigate**, and **resilient** as new features and integrations are added.