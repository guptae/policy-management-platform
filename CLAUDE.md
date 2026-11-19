# Policy Management Platform

## What this platform does
A Backend-for-Frontend (BFF) REST API and Angular dashboard for managing APAC insurance policies. The backend exposes four endpoints over 200+ seeded records.

## Model routing
- Sub-agent (test-agent): haiku — fast test generation.
- Main session (coordinator): sonnet — architecture decisions and orchestration.

## Tech stack
- Backend: Java 21, Spring Boot 3.x, Spring Data JPA, Flyway, Springdoc OpenAPI
- Database: PostgreSQL (local/Docker), SQL Server (prod)
- Frontend: Angular 17+, Angular Material, NgRx SignalStore
- Testing: JUnit 5, Mockito, Testcontainers
- Container: Docker + Docker Compose

## Architecture layers (backend)
- api/              HTTP controllers, DTOs, MapStruct mappers
- service/          Business logic, port interfaces
- domain/           Policy entity (plain Java), enums — no framework imports
- infrastructure/   JPA entities, repositories, Flyway migrations

## Folders
- backend/          Spring Boot source — all generated code goes here
- frontend/         Angular source
- output/           Any generated reports or artefacts

## API conventions
- Base path: /api/v1
- Pagination: ?page=0&size=20 (zero-based)
- Sort: ?sort=premiumAmount,desc
- Enums (API labels): status (Active|Expired|Pending|Cancelled), lineOfBusiness(Property|Casualty|A&H|Marine)
- Enums (Java/DB): ACTIVE|EXPIRED|PENDING|CANCELLED, PROPERTY|CASUALTY|AH|MARINE
- Error format: RFC 7807 ProblemDetail

## Do not
- Do not write files outside backend/, frontend/, or output/.
- Do not expose domain entities directly — always map to DTOs.
- Do not skip Flyway migrations — schema changes must be versioned.
- Do not hard-code DB credentials — use environment variables.
