# YESS! GO - Web Panels

Modern TypeScript web applications for the YESS! GO loyalty system.

## Structure

- **admin-panel/** - Admin dashboard application
- **partner-panel/** - Partner portal application
- **shared/** - Shared components, utilities, and types

## Quick Start

### Development

```bash
# Admin Panel
cd admin-panel
npm install
npm run dev

# Partner Panel
cd partner-panel
npm install
npm run dev
```

### Production Build

```bash
# Admin Panel
cd admin-panel
npm run build:prod

# Partner Panel
cd partner-panel
npm run build:prod
```

### Docker

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Technology Stack

- React 18.2 + TypeScript 5.3
- Vite 5.0
- Ant Design 5.12
- React Query + Zustand
- React Router v6

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.
