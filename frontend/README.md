# Scrum Poker - Frontend

Frontend de la aplicación Scrum Poker construido con React 19 + Vite + TypeScript.

## Tecnologías Principales

- **React 19** - UI library con React Compiler habilitado
- **Vite** - Build tool ultrarrápido
- **TypeScript** - Tipado estático
- **Framer Motion** - Animaciones fluidas
- **Zustand** - State management ligero
- **Socket.IO Client** - Comunicación en tiempo real

## Características

### 🎵 Sistema de Sonidos
- Web Audio API para reproducir sonidos sin archivos externos
- 6 sonidos diferentes: voto, revelación, expulsión, unión, salida, reset
- Toggle para activar/desactivar sonidos
- Persistencia de preferencia en localStorage

### ⌨️ Atajos de Teclado
- **1-8** - Seleccionar carta (mapeo según modo Fibonacci u Horas)
- **Q** - Carta "?"
- **C** - Carta "☕"
- **Espacio** - Revelar votos (solo host, con ≥2 votos)

### 🎨 Sistema de Diseño
- Diseño minimalista dark theme
- Colores: negro (#0d0d0d), rojo accent (#ff3c3c)
- Tipografías: Archivo Black (display), Space Mono (body)
- Responsive: mobile-first con breakpoints 480px, 640px, 768px

### 🌍 Internacionalización
- Soporte para Español e Inglés
- Traducciones centralizadas en `src/i18n.ts`

### 📁 Estructura de Carpetas

```
src/
├── components/          # Componentes React
│   ├── GameBoard.tsx   # Tablero principal de juego
│   ├── Lobby.tsx       # Sala de espera
│   ├── RoomManager.tsx # Crear/unirse a salas
│   ├── KickedOut.tsx   # Página de expulsión
│   ├── RoundHistory.tsx # Historial de rondas
│   ├── SessionReport.tsx # Reporte de sesión
│   └── ...
├── hooks/              # Custom hooks
│   ├── useGameStore.ts # Estado global con Zustand
│   ├── useSocket.ts    # Conexión WebSocket
│   └── socket.ts       # Configuración Socket.IO
├── utils/              # Utilidades
│   └── sound.ts        # Sistema de sonidos
├── i18n.ts            # Traducciones
└── App.tsx            # Componente raíz
```

## Scripts

```bash
# Desarrollo
npm run dev              # Iniciar dev server (localhost:5173)

# Build
npm run build            # Build para producción
npm run preview          # Previsualizar build

# Testing
npm run test             # Ejecutar tests

# Linting
npm run lint             # ESLint
```

## Variables de Entorno

Crear archivo `.env`:

```env
VITE_BACKEND_URL=http://localhost:3000  # URL del backend
```

## Características Técnicas

- **Web Audio API** - Síntesis de sonidos sin dependencias externas
- **Motion variants** - Animaciones reutilizables con Framer Motion
- **Optimistic UI** - Actualización inmediata del voto local
- **Debouncing** - Prevenir doble envío de votos
- **Error boundaries** - Manejo de errores de imagen (avatars)

## Deploy

El build genera archivos estáticos en `dist/` listos para servir con cualquier servidor web.

```bash
npm run build
# Servir carpeta dist/
```
