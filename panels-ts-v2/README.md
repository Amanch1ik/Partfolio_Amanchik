<div align="center">

# 🚀 YESS! GO - Web Panels:

**Modern TypeScript Web Applications for Loyalty System Management**

[![React](https://img.shields.io/badge/React-18.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5.12-0170FE?logo=ant-design)](https://ant.design/)

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation)

</div>

---

## 📋 Overview

This repository contains two modern web applications built with React and TypeScript for the YESS! GO loyalty system:

- **👨‍💼 Admin Panel** - Comprehensive administration dashboard for system management
- **🤝 Partner Panel** - Partner portal for business owners and managers

Both applications feature responsive design, internationalization, real-time updates, and comprehensive monitoring.

---

## ✨ Features

### 🔧 Technology Stack

- **Frontend Framework**: React 18.2 with TypeScript 5.3
- **Build Tool**: Vite 5.0 (lightning-fast development)
- **UI Framework**: Ant Design 5.12
- **State Management**: Zustand + React Query
- **Routing**: React Router v6
- **Maps**: React Leaflet with OpenStreetMap
- **Styling**: CSS Modules + Ant Design Theme
- **Internationalization**: i18n support (Russian, English, Kyrgyz)
- **Monitoring**: Comprehensive API metrics, error logging, and performance monitoring

### 🎨 Admin Panel Features

- 📊 **Dashboard** - Real-time statistics and analytics
- 👥 **User Management** - Complete user lifecycle management
- 🏪 **Partner Management** - Partner network administration
- 🗺️ **Interactive Map** - Geolocation and partner visualization
- 💰 **Transactions** - Transaction history and reporting
- 🔔 **Notifications** - System-wide notification center
- 🎁 **Promotions** - Campaign and promotion management
- 📺 **Stories** - Content management system
- 📊 **Monitoring** - System metrics and performance monitoring
- ⚙️ **Settings** - System configuration and preferences
- 📋 **Audit Logs** - Activity tracking and compliance

### 🤝 Partner Panel Features

- 📊 **Dashboard** - Business performance metrics
- 👤 **Profile Management** - Company profile and settings
- 📍 **Locations** - Multi-location management with maps
- 🎁 **Promotions** - Create and manage promotional campaigns
- 💰 **Transactions** - View transaction history and reports
- 👥 **Employees** - Team and access management

---

## 🏗️ Architecture

### Project Structure

```
panels-ts-v2/
├── admin-panel/              # Admin Panel Application
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── hooks/            # Custom React hooks
│   │   ├── store/            # State management
│   │   ├── styles/           # CSS and themes
│   │   ├── utils/            # Utility functions
│   │   └── types/            # TypeScript types
│   ├── public/               # Static assets
│   └── package.json
│
├── partner-panel/            # Partner Panel Application
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── hooks/            # Custom React hooks
│   │   ├── store/            # State management
│   │   ├── styles/           # CSS and themes
│   │   └── utils/            # Utility functions
│   ├── public/               # Static assets
│   └── package.json
│
├── shared/                   # Shared modules
│   └── monitoring/           # Monitoring system
│       ├── apiMetrics.ts     # API metrics tracking
│       ├── errorLogger.ts    # Error logging
│       ├── performanceMonitor.ts  # Performance monitoring
│       └── index.ts          # Exports
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # Architecture details
│   ├── MONITORING.md         # Monitoring guide
│   └── CHANGELOG.md          # Changelog
│
└── README.md                 # This file
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 8.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/Amanch1ik/panels-TS-v2.git
cd panels-ts-v2

# Install dependencies for Admin Panel
cd admin-panel
npm install

# Install dependencies for Partner Panel
cd ../partner-panel
npm install
```

### Development

```bash
# Start Admin Panel (http://localhost:3003)
cd admin-panel
npm run dev

# Start Partner Panel (http://localhost:3001)
cd partner-panel
npm run dev
```

### Production Build

```bash
# Build Admin Panel
cd admin-panel
npm run build

# Build Partner Panel
cd partner-panel
npm run build
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` files in each panel directory:

**`.env` (Admin Panel / Partner Panel):**
```env
VITE_API_URL=http://localhost:8000
VITE_ENV=development
VITE_WS_ENABLED=false
VITE_ENABLE_METRICS=true
VITE_ENABLE_ERROR_LOGGING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### Available Ports

- **Admin Panel**: `http://localhost:3003`
- **Partner Panel**: `http://localhost:3001`
- **Backend API**: `http://localhost:8000` (external dependency)

---

## 📊 Monitoring

Both panels include comprehensive monitoring capabilities:

- **API Metrics** - Track all API requests, response times, and errors
- **Error Logging** - Centralized error tracking and analysis
- **Performance Monitoring** - Web Vitals and performance metrics
- **Dashboard** - Real-time monitoring dashboard (`/monitoring` in admin panel)

See [docs/MONITORING.md](docs/MONITORING.md) for detailed monitoring documentation.

---

## 🛠️ Development

### Available Scripts

#### Admin Panel & Partner Panel

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint

# Testing (Admin Panel only)
npm test
npm run test:coverage
```

### Code Style

- TypeScript strict mode
- ESLint for code quality
- Prettier-friendly formatting
- Component-based architecture

---

## 🐳 Docker

Both panels include Dockerfiles for containerized deployment:

```bash
# Build Admin Panel
docker build -t yess-admin-panel ./admin-panel

# Build Partner Panel
docker build -t yess-partner-panel ./partner-panel

# Run containers
docker run -p 3003:80 yess-admin-panel
docker run -p 3001:80 yess-partner-panel
```

---

## 🔒 Security

- JWT-based authentication
- Protected routes and role-based access control
- Secure API communication
- Environment variable management
- Content Security Policy support

---

## 🌍 Internationalization

Both panels support multiple languages:
- 🇷🇺 Russian (default)
- 🇬🇧 English
- 🇰🇬 Kyrgyz

Translation files are located in `src/i18n/translations.ts`

---

## 📦 Dependencies

### Core Dependencies

- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `@tanstack/react-query` - Data fetching and caching
- `zustand` - State management
- `antd` - UI component library
- `axios` - HTTP client
- `dayjs` - Date manipulation

### Development Dependencies

- `typescript` - Type safety
- `vite` - Build tool
- `eslint` - Code linting
- `@types/*` - TypeScript definitions

---

## 📚 Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - Project architecture and structure
- **[Monitoring](docs/MONITORING.md)** - Monitoring system guide
- **[Changelog](docs/CHANGELOG.md)** - History of changes


---

## 🙏 Acknowledgments

- [React](https://react.dev/) - UI library
- [Ant Design](https://ant.design/) - Component library
- [Vite](https://vitejs.dev/) - Build tool
- [React Leaflet](https://react-leaflet.js.org/) - Maps integration

---

<div align="center">

**Made with ❤️ for YESS! GO**

⭐ Star this repo if you find it helpful!

</div>
