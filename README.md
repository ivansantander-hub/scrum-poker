# Scrum Poker

Planning Poker para equipos ágiles - Una aplicación en tiempo real para estimar historias de usuario.

[🇬🇧 English](#english) | [🇪🇸 Español](#español)

<a name="español"></a>
## 🇪🇸 Documentación en Español

### Características Principales

- 🎯 **Votación en tiempo real** - WebSocket para actualizaciones instantáneas
- 🎵 **Sonidos** - Notificaciones de audio para votos, revelación, expulsión, etc.
- ⌨️ **Atajos de teclado** - Vota rápido con números, revela con espacio
- 👥 **Gestión de jugadores** - Host puede expulsar participantes
- 📊 **Estadísticas** - Promedio y desviación estándar por ronda
- 📈 **Historial de rondas** - Visualiza votaciones anteriores
- 📤 **Exportar CSV** - Descarga el historial completo
- 🌍 **Bilingüe** - Soporte para Español e Inglés
- 📱 **Responsive** - Funciona en desktop y móvil

### Atajos de Teclado

Durante una votación activa:
- **1-8** - Seleccionar carta (según modo Fibonacci u Horas)
- **Q** - Seleccionar carta "?"
- **C** - Seleccionar carta "☕"
- **Espacio** - Revelar votos (solo host, con ≥2 votos)

### Estructura del Proyecto

```
scrum-poker-v1/
├── backend/              # API NestJS con WebSockets
│   ├── src/
│   ├── test/
│   └── package.json
├── frontend/            # React + Vite + TypeScript
│   ├── src/
│   ├── public/
│   └── package.json
├── docs/                # Documentación adicional
├── package.json         # Root package.json
├── pnpm-workspace.yaml  # Configuración workspace
└── pnpm-lock.yaml
```

### Scripts Disponibles

```bash
# Desarrollo
pnpm dev                  # Iniciar frontend y backend en paralelo
pnpm dev:backend          # Solo backend (NestJS en localhost:3000)
pnpm dev:frontend         # Solo frontend (Vite en localhost:5173)

# Build
pnpm build                # Build de todos los proyectos
pnpm build:backend        # Solo backend
pnpm build:frontend       # Solo frontend

# Testing
pnpm test                 # Tests de todos los proyectos

# Linting
pnpm lint                 # Lint de todos los proyectos

# Limpieza
pnpm clean                # Limpiar node_modules y builds
```

### Tecnologías

- **Backend**: NestJS, TypeScript, Socket.IO, SQLite
- **Frontend**: React 19, Vite, Framer Motion, Zustand
- **Monorepo**: pnpm workspaces
- **Logging**: JSON structured logs
- **Rate Limiting**: Protección anti-spam integrada

### Características Técnicas

#### Backend (NestJS)
- **WebSockets** - Comunicación bidireccional en tiempo real
- **Structured Logging** - Logs JSON con timestamps y metadata
- **Rate Limiting** - Protección contra spam:
  - 5 votos por 10 segundos por jugador
  - 3 revelaciones por 5 segundos
  - 3 expulsiones por minuto
- **Base de datos SQLite** - Persistencia de historial de rondas
- **Cálculo de estadísticas** - Promedio y desviación estándar

#### Frontend (React)
- **Web Audio API** - Sistema de sonidos sin dependencias externas
- **Zustand** - State management ligero
- **Framer Motion** - Animaciones fluidas
- **i18n** - Soporte multilingüe
- **Keyboard shortcuts** - Navegación sin mouse
- **Responsive design** - Adaptable a cualquier pantalla

---

<a name="english"></a>
## 🇬🇧 English Documentation

### Main Features

- 🎯 **Real-time voting** - WebSocket for instant updates
- 🎵 **Sounds** - Audio notifications for votes, reveals, kicks, etc.
- ⌨️ **Keyboard shortcuts** - Quick voting with numbers, reveal with space
- 👥 **Player management** - Host can kick participants
- 📊 **Statistics** - Average and standard deviation per round
- 📈 **Round history** - View previous voting sessions
- 📤 **Export CSV** - Download complete voting history
- 🌍 **Bilingual** - English and Spanish support
- 📱 **Responsive** - Works on desktop and mobile

### Keyboard Shortcuts

During an active voting session:
- **1-8** - Select card (according to Fibonacci or Hours mode)
- **Q** - Select "?" card
- **C** - Select "☕" card
- **Space** - Reveal votes (host only, with ≥2 votes)

### Project Structure

```
scrum-poker-v1/
├── backend/              # NestJS API with WebSockets
│   ├── src/
│   ├── test/
│   └── package.json
├── frontend/            # React + Vite + TypeScript
│   ├── src/
│   ├── public/
│   └── package.json
├── docs/                # Additional documentation
├── package.json         # Root package.json
├── pnpm-workspace.yaml  # Workspace config
└── pnpm-lock.yaml
```

### Available Scripts

```bash
# Development
pnpm dev                  # Start frontend and backend in parallel
pnpm dev:backend          # Backend only (NestJS on localhost:3000)
pnpm dev:frontend         # Frontend only (Vite on localhost:5173)

# Build
pnpm build                # Build all projects
pnpm build:backend        # Backend only
pnpm build:frontend       # Frontend only

# Testing
pnpm test                 # All project tests

# Linting
pnpm lint                 # Lint all projects

# Cleanup
pnpm clean                # Clean node_modules and builds
```

### Technologies

- **Backend**: NestJS, TypeScript, Socket.IO, SQLite
- **Frontend**: React 19, Vite, Framer Motion, Zustand
- **Monorepo**: pnpm workspaces
- **Logging**: JSON structured logs
- **Rate Limiting**: Built-in anti-spam protection

### Technical Features

#### Backend (NestJS)
- **WebSockets** - Real-time bidirectional communication
- **Structured Logging** - JSON logs with timestamps and metadata
- **Rate Limiting** - Spam protection:
  - 5 votes per 10 seconds per player
  - 3 reveals per 5 seconds
  - 3 kicks per minute
- **SQLite Database** - Round history persistence
- **Statistics calculation** - Average and standard deviation

#### Frontend (React)
- **Web Audio API** - Sound system without external dependencies
- **Zustand** - Lightweight state management
- **Framer Motion** - Smooth animations
- **i18n** - Multilingual support
- **Keyboard shortcuts** - Mouse-free navigation
- **Responsive design** - Adapts to any screen size

---

## 📄 Licencia / License

MIT License - Ver [LICENSE](./LICENSE) para más detalles / See [LICENSE](./LICENSE) for details.

## 🤝 Contribuir / Contributing

¡Las contribuciones son bienvenidas! / Contributions are welcome!

1. Fork el repositorio / Fork the repository
2. Crea una rama / Create a branch: `git checkout -b feature/nueva-funcionalidad`
3. Commitea tus cambios / Commit your changes: `git commit -am 'Add: nueva funcionalidad'`
4. Push a la rama / Push to the branch: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request / Open a Pull Request
