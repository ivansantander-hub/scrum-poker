# Roadmap / Ideas

## ✅ Completadas / Completed

### Funcionalidades / Features

- [x] **1. Historial de rondas** - Ver votaciones anteriores con timestamps
- [x] **4. Kick player** - El host puede expulsar jugadores (con redirección a página dedicada)
- [x] **5. Exportar a CSV** - Descargar historial de votaciones
- [x] **6. Estadísticas** - Promedios, desviación estándar por ronda
- [x] **8. Sonidos** - Notificaciones al votar/revelar/unirse/salir/expulsar
- [x] **10. Keyboard shortcuts** - Revelar con espacio, votar con números (1-8), Q para ?, C para ☕

### Técnicas / Technical

- [x] **13. Logging** - Structured logs con formato JSON, timestamps y metadata
- [x] **14. Rate limiting** - Protección anti-spam:
  - 5 votos por 10 segundos por jugador
  - 3 revelaciones por 5 segundos
  - 3 expulsiones por minuto

---

## 🔄 En Progreso / In Progress

_Ninguna actualmente / None currently_

---

## 📋 Pendientes / Backlog

### Funcionalidades / Features

- [ ] **2. Modo T-shirt** - Tamaños (XS, S, M, L, XL) además de Fibonacci/Horas
- [ ] **3. Password en rooms** - Proteger salas con clave
- [ ] **7. Temas** - Dark/Light mode toggle
- [ ] **9. PWA** - Instalar como app móvil con offline support

### Técnicas / Technical

- [ ] **11. Tests** - Unit tests con Vitest + E2E con Playwright
- [ ] **12. CI/CD** - GitHub Actions para deploy automático y testing
- [ ] **15. Docker** - Containerización para fácil deployment
- [ ] **16. Redis** - Adapter para escalar WebSockets horizontalmente

---

## 💡 Ideas Futuras / Future Ideas

- Timer para votaciones / Voting timer
- Votación anónima vs pública / Anonymous vs public voting
- Sala de observadores / Observer room (sin votar)
- Integración con JIRA/Trello / Issue tracker integration
- Modo "Planificación Poker Asincrónica" / Async planning poker
- Notificaciones push / Push notifications
- Analytics dashboard para admins / Analytics dashboard
- Timer para votaciones / Voting timer
- Votación anónima vs pública / Anonymous vs public voting
- Sala de observadores / Observer room (sin votar)
- Integración con JIRA/Trello / Issue tracker integration
- Modo "Planificación Poker Asincrónica" / Async planning poker
- Notificaciones push / Push notifications
- Analytics dashboard para admins / Analytics dashboard

---

**Última actualización:** Marzo 2026
