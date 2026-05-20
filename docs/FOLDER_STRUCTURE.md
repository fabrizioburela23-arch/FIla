# Fila — Estructura de Carpetas del Proyecto

```
fila/                                     ← Raíz del monorepo
│
├── apps/
│   │
│   ├── api/                              ← Backend Node.js + Fastify
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma             ← Definición de modelos ORM
│   │   │   └── migrations/              ← Migraciones versionadas
│   │   │
│   │   └── src/
│   │       │
│   │       ├── server.ts                 ← Bootstrap: Fastify + Socket.io + Prisma
│   │       │
│   │       ├── config/
│   │       │   ├── env.ts               ← Variables de entorno validadas (zod)
│   │       │   ├── database.ts          ← Cliente Prisma singleton
│   │       │   └── redis.ts             ← Cliente Redis (sesiones / caché ETA)
│   │       │
│   │       ├── modules/                 ← Un módulo = una entidad de negocio
│   │       │   │
│   │       │   ├── auth/
│   │       │   │   ├── auth.controller.ts   ← Handlers HTTP (login, refresh, logout)
│   │       │   │   ├── auth.service.ts      ← JWT, bcrypt, validar credenciales
│   │       │   │   ├── auth.routes.ts       ← Registro de rutas en Fastify
│   │       │   │   └── auth.schema.ts       ← Schemas Zod/JSON-Schema para validación
│   │       │   │
│   │       │   ├── accounts/
│   │       │   │   ├── accounts.controller.ts
│   │       │   │   ├── accounts.service.ts  ← CRUD tenant, lógica de plan y precios
│   │       │   │   ├── accounts.routes.ts
│   │       │   │   └── accounts.schema.ts
│   │       │   │
│   │       │   ├── branches/
│   │       │   │   ├── branches.controller.ts
│   │       │   │   ├── branches.service.ts  ← CRUD sucursal, toggle isOpen
│   │       │   │   ├── branches.routes.ts
│   │       │   │   ├── branches.schema.ts
│   │       │   │   └── qr.generator.ts      ← Genera QR con qrcode npm
│   │       │   │
│   │       │   ├── services/
│   │       │   │   ├── services.controller.ts
│   │       │   │   ├── services.service.ts  ← CRUD cola, recalcular avg_attention_secs
│   │       │   │   ├── services.routes.ts
│   │       │   │   └── services.schema.ts
│   │       │   │
│   │       │   ├── operators/
│   │       │   │   ├── operators.controller.ts
│   │       │   │   ├── operators.service.ts ← CRUD operador, toggle status
│   │       │   │   ├── operators.routes.ts
│   │       │   │   └── operators.schema.ts
│   │       │   │
│   │       │   ├── tickets/
│   │       │   │   ├── tickets.controller.ts   ← POST /join, GET /status/:id
│   │       │   │   ├── tickets.service.ts      ← Lógica de fila: join, call, complete, transfer
│   │       │   │   ├── tickets.repository.ts   ← Queries Prisma de alta frecuencia
│   │       │   │   ├── tickets.routes.ts
│   │       │   │   ├── tickets.schema.ts
│   │       │   │   └── eta.calculator.ts       ← ETA = avgSecs * posición en fila
│   │       │   │
│   │       │   └── analytics/
│   │       │       ├── analytics.controller.ts
│   │       │       ├── analytics.service.ts    ← TPE, TPA por operador/servicio/rango
│   │       │       ├── analytics.routes.ts
│   │       │       └── analytics.schema.ts
│   │       │
│   │       ├── realtime/                ← Capa WebSocket (Socket.io)
│   │       │   ├── socket.gateway.ts    ← Inicialización del servidor Socket.io
│   │       │   ├── socket.events.ts     ← Constantes de eventos (TICKET_CALLED, etc.)
│   │       │   ├── rooms.manager.ts     ← Gestión de rooms por branch/service/ticket
│   │       │   └── handlers/
│   │       │       ├── operator.handler.ts  ← Eventos: call_next, no_show, transfer
│   │       │       └── client.handler.ts    ← Eventos: join_queue, cancel_ticket
│   │       │
│   │       └── shared/
│   │           ├── middleware/
│   │           │   ├── authenticate.ts   ← Verifica JWT, adjunta req.user
│   │           │   └── tenant.guard.ts   ← Verifica que el recurso pertenece al tenant
│   │           ├── utils/
│   │           │   ├── response.ts       ← Helpers de respuesta HTTP estándar
│   │           │   └── logger.ts         ← Pino logger configurado
│   │           └── types/
│   │               └── index.ts          ← Tipos compartidos del backend
│   │
│   └── web/                             ← Frontend React 18 + Vite + Tailwind CSS
│       │
│       ├── public/
│       │   ├── manifest.json            ← PWA manifest
│       │   ├── sw.js                    ← Service Worker (caché offline)
│       │   └── icons/                   ← Iconos PWA 192/512
│       │
│       └── src/
│           │
│           ├── main.tsx                 ← Punto de entrada, React.StrictMode
│           ├── App.tsx                  ← Router (React Router v6)
│           │
│           ├── app/                     ← Páginas organizadas por módulo
│           │   │
│           │   ├── client/              ← Flujo del cliente (Mobile-First PWA)
│           │   │   ├── JoinPage.tsx     ← /s/:branchId — Seleccionar servicio
│           │   │   ├── ConfirmPage.tsx  ← Paso 2: Nombre (opcional) + confirmar
│           │   │   └── StatusPage.tsx   ← /s/:branchId/ticket/:ticketId — Estado en vivo
│           │   │
│           │   ├── operator/            ← Consola del operador (Modo Enfoque)
│           │   │   ├── LoginPage.tsx    ← Acceso del operador
│           │   │   └── ConsolePage.tsx  ← /operator/:operatorId — Panel en tiempo real
│           │   │
│           │   ├── tv/
│           │   │   └── DisplayPage.tsx  ← /s/:branchId/tv — Pantalla sala de espera
│           │   │
│           │   └── admin/               ← Dashboard del negocio (protegido por JWT)
│           │       ├── DashboardPage.tsx    ← /admin — Resumen ejecutivo
│           │       ├── BranchesPage.tsx     ← Gestión de sucursales + QR
│           │       ├── ServicesPage.tsx     ← Gestión de colas/servicios
│           │       ├── OperatorsPage.tsx    ← Gestión de operadores/ventanillas
│           │       └── AnalyticsPage.tsx    ← Gráficas TPE/TPA
│           │
│           ├── components/              ← Componentes React reutilizables
│           │   │
│           │   ├── ui/                  ← Design System base (sin lógica de negocio)
│           │   │   ├── Button.tsx
│           │   │   ├── Card.tsx
│           │   │   ├── Badge.tsx
│           │   │   ├── Modal.tsx
│           │   │   ├── Input.tsx
│           │   │   ├── Select.tsx
│           │   │   ├── Spinner.tsx
│           │   │   ├── ProgressBar.tsx
│           │   │   └── Avatar.tsx
│           │   │
│           │   ├── queue/               ← Componentes del flujo del cliente
│           │   │   ├── ServiceCard.tsx      ← Tarjeta de selección de servicio
│           │   │   ├── TicketDisplay.tsx    ← Número de turno en grande
│           │   │   ├── QueuePosition.tsx    ← "X personas adelante en la fila"
│           │   │   ├── WaitProgress.tsx     ← Barra de progreso visual
│           │   │   └── ETACountdown.tsx     ← Tiempo estimado dinámico
│           │   │
│           │   ├── operator/            ← Componentes de la consola del operador
│           │   │   ├── CurrentTicket.tsx    ← Turno activo en tipografía gigante
│           │   │   ├── WaitingList.tsx      ← Próximos 5 en la fila
│           │   │   ├── ActionButtons.tsx    ← Llamar / No se presentó / Transferir
│           │   │   └── TransferModal.tsx    ← Modal de selección de servicio destino
│           │   │
│           │   ├── tv/                  ← Componentes de la pantalla pública
│           │   │   ├── CalledList.tsx       ← Últimos 4 turnos llamados (cuadrícula)
│           │   │   └── CalledHighlight.tsx  ← Turno destacado (50% pantalla, parpadeo)
│           │   │
│           │   └── admin/               ← Componentes del dashboard
│           │       ├── BranchCard.tsx
│           │       ├── QRCodePanel.tsx      ← Generador/visualizador de QR
│           │       ├── ServiceForm.tsx
│           │       ├── OperatorForm.tsx
│           │       └── AnalyticsChart.tsx   ← Recharts: TPE/TPA por operador
│           │
│           ├── hooks/                   ← Custom React hooks
│           │   ├── useSocket.ts         ← Conexión Socket.io con reconexión automática
│           │   ├── useTicketStatus.ts   ← Suscripción en tiempo real al turno
│           │   ├── useQueueState.ts     ← Estado de la fila para el operador
│           │   ├── useAuth.ts           ← Autenticación + estado del usuario
│           │   └── useTVDisplay.ts      ← Estado para la pantalla pública
│           │
│           ├── stores/                  ← Estado global (Zustand)
│           │   ├── authStore.ts         ← Token JWT, usuario autenticado
│           │   ├── queueStore.ts        ← Estado de la fila en tiempo real
│           │   └── uiStore.ts           ← Notificaciones, modales
│           │
│           ├── services/                ← Capa de comunicación con el API
│           │   └── api/
│           │       ├── client.ts        ← Axios instance con interceptores JWT
│           │       ├── tickets.api.ts   ← join, status, cancel
│           │       ├── branches.api.ts
│           │       ├── services.api.ts
│           │       ├── operators.api.ts
│           │       └── analytics.api.ts
│           │
│           └── lib/
│               ├── socket/
│               │   └── socket.client.ts  ← Instancia Socket.io configurada
│               ├── utils/
│               │   ├── formatters.ts     ← Formatear tiempos, fechas, números
│               │   └── sounds.ts         ← Reproducir sonido de llamada (TV)
│               └── validations/
│                   └── schemas.ts        ← Schemas Zod reutilizables
│
├── packages/                            ← Paquetes compartidos del monorepo
│   │
│   ├── shared-types/                    ← Tipos TypeScript 100% compartidos API↔Web
│   │   └── src/
│   │       ├── ticket.types.ts
│   │       ├── socket.events.ts         ← Mismos eventos que en el backend
│   │       └── index.ts
│   │
│   └── ui-kit/                          ← Componentes UI base exportables
│       └── src/
│           └── index.ts
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   └── Dockerfile.web
│   └── nginx/
│       └── default.conf                 ← Proxy inverso API + Web + WS upgrade
│
├── .github/
│   └── workflows/
│       └── ci.yml                       ← GitHub Actions: lint + test + build
│
├── docs/
│   ├── DATABASE_SCHEMA.sql              ← Esquema PostgreSQL completo
│   └── FOLDER_STRUCTURE.md              ← Este archivo
│
├── docker-compose.yml                   ← PostgreSQL + Redis + API + Web
├── docker-compose.dev.yml               ← Override para desarrollo local
├── package.json                         ← Workspace root (pnpm)
├── pnpm-workspace.yaml
└── .env.example
```
