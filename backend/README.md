# Scrum Poker - Backend

API REST y WebSocket para la aplicación Scrum Poker construida con NestJS + TypeScript + SQLite.

## Tecnologías Principales

- **NestJS** - Framework Node.js progresivo
- **TypeScript** - Tipado estático
- **Socket.IO** - WebSockets para tiempo real
- **SQLite** - Base de datos ligera
- **@nestjs/throttler** - Rate limiting

## Características

### 🔄 WebSocket Gateway

Events disponibles:
- `createRoom` - Crear nueva sala
- `joinRoom` - Unirse a sala existente
- `startGame` - Iniciar juego (host)
- `submitVote` - Enviar voto
- `revealVotes` - Revelar votaciones (host)
- `resetVotes` - Nueva ronda (host)
- `kickPlayer` - Expulsar jugador (host)
- `getRoundHistory` - Obtener historial
- `getSessionStats` - Obtener estadísticas
- `exportToCSV` - Exportar a CSV

### 📝 Structured Logging

Sistema de logs en formato JSON:
```json
{
  "timestamp": "2026-03-28T12:00:00.000Z",
  "level": "info",
  "message": "Room created",
  "context": "AppGateway",
  "metadata": { "roomCode": "ABC123", "playerCount": 1 }
}
```

### 🛡️ Rate Limiting

Protección anti-spam:
- **Votos**: 5 por 10 segundos por jugador
- **Revelaciones**: 3 por 5 segundos por sala
- **Expulsiones**: 3 por minuto por host

### 💾 Base de Datos SQLite

Esquema:
```sql
rooms (code, created_at)
players (id, room_code, name, avatar, is_host, socket_id)
rounds (id, room_code, round_number, average, std_dev, created_at)
votes (id, round_id, player_id, value, created_at)
```

### 📊 Cálculo de Estadísticas

- **Promedio**: Media aritmética de votos válidos
- **Desviación estándar**: σ = √(Σ(x - μ)² / n)

### 📁 Estructura de Carpetas

```
src/
├── websockets/
│   └── app.gateway.ts      # WebSocket Gateway principal
├── database/
│   └── database.service.ts  # Servicio SQLite
├── common/
│   ├── structured-logger.service.ts  # Logger JSON
│   └── vote-rate-limiter.service.ts  # Rate limiting
├── app.module.ts           # Módulo raíz
└── main.ts                 # Entry point
```

## Scripts

```bash
# Desarrollo
pnpm start:dev             # Watch mode
pnpm start               # Modo desarrollo

# Build
pnpm build                # Compilar para producción
pnpm start:prod          # Ejecutar build de producción

# Testing
pnpm test                 # Unit tests
pnpm test:e2e            # End-to-end tests
pnpm test:cov            # Coverage
```

## Variables de Entorno

Crear archivo `.env`:

```env
PORT=3000                          # Puerto del servidor
CORS_ORIGIN=http://localhost:5173  # Origen permitido (frontend)
```

## API WebSocket

### Crear Sala
```javascript
socket.emit('createRoom', {
  playerName: 'John',
  estimationType: 'fibonacci', // o 'hours'
  avatar: 'vincent.webp'
})
```

### Unirse a Sala
```javascript
socket.emit('joinRoom', {
  roomCode: 'ABC123',
  playerName: 'Jane',
  avatar: 'vincent.webp'
})
```

### Votar
```javascript
socket.emit('submitVote', {
  roomCode: 'ABC123',
  playerId: 'player-uuid',
  vote: '5'
})
```

### Eventos del Servidor
```javascript
socket.on('roomUpdated', (room) => {
  // Datos actualizados de la sala
})

socket.on('playerKicked', () => {
  // Jugador expulsado
})

socket.on('votesRevealed', (votes) => {
  // Votos revelados
})
```

## Características Técnicas

- **In-memory rate limiting** - Límites por jugador/sala sin Redis
- **SQLite WAL mode** - Mejor performance concurrente
- **Graceful shutdown** - Cierre ordenado de conexiones
- **Error handling** - Captura y log de errores
- **Room cleanup** - Limpieza automática de salas vacías

## Deploy

```bash
# Build
pnpm build

# Producción
pnpm start:prod
```

### Docker (opcional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

## Monitoreo

Logs en formato JSON para integración con:
- ELK Stack
- Datadog
- Splunk
- CloudWatch

Ejemplo de log de rate limit:
```json
{
  "timestamp": "2026-03-28T12:00:00.000Z",
  "level": "warn",
  "message": "Rate limit exceeded",
  "context": "VoteRateLimiter",
  "metadata": { "playerId": "xxx", "action": "vote", "window": 10 }
}
```
