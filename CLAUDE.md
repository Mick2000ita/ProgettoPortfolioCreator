# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Portfolio Creator — a full-stack web application for creating and managing portfolio pages. The stack is:
- **Frontend**: Angular 21 (standalone components, SSR via Express, PrimeNG UI, ngx-translate for IT/EN i18n)
- **Backend**: Spring Boot 4 (Java 21, JWT + Google OAuth2 auth, JPA/Hibernate, Flyway migrations)
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker Compose, Nginx (production reverse proxy)

## Development Commands

All development runs inside Docker. Use the `Makefile` in the project root:

```bash
make start       # Start dev environment (hot reload frontend + backend + db)
make stop        # Stop all containers
make restart     # Restart containers
make logs        # Tail all service logs
make logs-fe     # Frontend logs only
make logs-be     # Backend logs only
make build       # Rebuild Docker images
make start-prod  # Start production environment (Nginx + built frontend)
```

### Running tests

```bash
# Frontend tests (inside the container or locally with Node)
cd frontend && npm run test

# Backend tests (inside the container or locally with Java 21)
cd backend && ./mvnw test
```

## Environment Setup

Copy or create a `.env` file in the project root before starting. Required variables:

```
DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET
BACKEND_PORT, FRONTEND_PORT
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

Frontend environment files live in [frontend/src/environments/](frontend/src/environments/):
- `environment.ts` — dev (`apiUrl: http://localhost:8080`)
- `environment.prod.ts` — prod (`apiUrl: ''`, uses relative paths via Nginx proxy)

## Architecture

### Request Flow

```
Browser → Angular (port 4210 dev / 4200 prod)
              ↓ /api/* requests
         Nginx (prod) or proxy (dev)
              ↓
         Spring Boot (port 8080)
              ↓
         PostgreSQL (port 5431 on host)
```

In production, Nginx serves the static Angular build and proxies `/api/*` to the backend container.

### Backend Domain Structure

The backend follows **Domain-Driven Design** with a strict 4-layer pattern inside each domain:

```
com.jmportfolio.jm/
├── core/
│   ├── auth/          # JWT utils, Spring Security config, JwtUserDetails
│   └── exceptions/    # Global exception handler
├── domains/
│   ├── auth/          # Login, register, token refresh
│   ├── users/         # User profile management
│   ├── portfolios/    # Portfolio CRUD
│   ├── projects/      # Projects within portfolios
│   ├── roles/         # User roles
│   ├── apptemplates/  # Predefined templates
│   ├── usertemplates/ # User-customized templates
│   └── googleauth/    # Google OAuth token verification
```

Each domain follows: `client/` (controllers + DTOs) → `application/` (services) → `domain/` (models + repo interfaces) → `infrastructure/` (JPA entities, mappers, DB repos).

**Active API endpoints:**
- `POST /api/auth/login` — credential login, returns JWT access + refresh tokens
- `POST /api/auth/register` — user registration
- `POST /api/auth/refresh` — refresh access token
- `GET  /api/user/{id}` — get user by ID
- `POST /api/google/verify` — verify Google OAuth token

### Frontend Structure

The Angular app uses **standalone components** (no NgModules). Global config is in [frontend/src/app/app.config.ts](frontend/src/app/app.config.ts).

Key areas:
- `login-page/` — Authentication UI (form login + Google OAuth button)
- `login-page/auth.service.ts` — JWT storage, token refresh, API calls
- `public/i18n/it.json` & `en.json` — translation strings (default language: Italian)

### Database

Schema is managed by **Flyway** migrations in [backend/src/main/resources/db/migration/](backend/src/main/resources/db/migration/). JPA `ddl-auto` is set to `validate`, so the schema must exist before startup — always add new tables/columns via a new migration file, never rely on auto-DDL.

Core tables: `roles`, `users`, `portfolios`, `projects`, `app_templates`, `user_templates`.

### Authentication Flow

1. User logs in via form or Google OAuth
2. Backend issues a short-lived JWT access token + long-lived refresh token
3. Frontend stores tokens; `auth.service.ts` auto-refreshes on 401
4. Spring Security's `JwtUserDetails` validates the token on every request
