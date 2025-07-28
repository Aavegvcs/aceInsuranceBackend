# ACE Backend - Agent Guidelines

## Commands
- **Build**: `npm run build` - Compile TypeScript to dist/
- **Dev**: `npm run start:dev` - Start with watch mode  
- **Test**: `npm run test` - Run Jest unit tests
- **Test single**: `npm run test -- --testNamePattern="test name"` or `npm run test path/to/file.spec.ts`
- **E2E**: `npm run test:e2e` - Run end-to-end tests
- **Lint**: `npm run lint` - ESLint with auto-fix
- **Format**: `npm run format` - Prettier formatting

## Architecture
- **Framework**: NestJS with TypeScript, Express server on ports 3002 (HTTPS) and 3004 (HTTP)
- **Database**: MySQL with TypeORM, AWS Secrets Manager for credentials
- **Structure**: Modular architecture in `src/modules/` with 30+ business modules (auth, branch, client, employee, etc.)
- **Config**: `src/config/` for database, report, swagger configurations
- **Utilities**: `src/utils/` for shared utilities, logging with Winston

## Code Style
- **Imports**: Use `@modules/*` path alias, NestJS decorators (`@Injectable`, `@Controller`)
- **Types**: TypeScript with interfaces, DTOs for validation, entity classes for TypeORM
- **Naming**: camelCase variables/methods, PascalCase classes, kebab-case files
- **Error Handling**: NestJS exceptions (`BadRequestException`, `NotFoundException`, etc.)
- **Async**: Use async/await, transactions for database operations
- **Validation**: class-validator decorators in DTOs
- **No strict types**: `strictNullChecks: false`, `noImplicitAny: false` in tsconfig
