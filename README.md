# Scrum Poker Monorepo

Monorepo para la aplicación Scrum Poker con frontend React y backend NestJS.

## Estructura

```
scrum-poker-v1/
├── backend/              # API NestJS
│   ├── src/
│   ├── test/
│   └── package.json
├── frontend/            # Aplicación React + Vite
│   ├── src/
│   ├── public/
│   └── package.json
├── node_modules/
├── package.json          # Root package.json
├── pnpm-workspace.yaml  # Workspace config
└── pnpm-lock.yaml
```

## Scripts Disponibles

```bash
# Desarrollo
pnpm dev                  # Iniciar ambos proyectos en paralelo
pnpm dev:backend          # Solo backend (NestJS)
pnpm dev:frontend         # Solo frontend (Vite)

# Build
pnpm build                # Build de todos los proyectos
pnpm build:backend        # Solo backend
pnpm build:frontend       # Solo frontend

# Testing
pnpm test                 # Tests de todos los proyectos

# Linting
pnpm lint                # Lint de todos los proyectos

# Limpieza
pnpm clean               # Limpiar node_modules y builds
```

## Paquetes

- **@scrum-poker/backend**: API REST/WebSocket con NestJS
- **@scrum-poker/frontend**: Interfaz de usuario con React + Vite

## Tecnologías

- **Backend**: NestJS, TypeScript, WebSockets
- **Frontend**: React 19, Vite, Framer Motion, TypeScript
- **Package Manager**: pnpm (workspace)
- **Monorepo Tool**: pnpm workspaces
