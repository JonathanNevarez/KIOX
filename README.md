# KIOX

PWA offline-first para POS de tienda pequeña-mediana. Funciona sin internet después de la primera instalación/carga. Persistencia principal con SQLite WASM (sql.js) y base lista para sincronización futura con PostgreSQL mediante patrón Outbox.

## Requisitos
- Node.js 18+
- npm

## Instalar dependencias
```
npm install
```

## Desarrollo
```
npm run dev
```

## Build de producción
```
npm run build
```

## Preview
```
npm run preview
```

## Despliegue en Vercel
1. Importa el repo en Vercel.
2. Framework: Vite.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Variables de entorno:
   - `DATABASE_URL` (Postgres de Neon/Supabase)
   - `SYNC_API_KEY` (opcional, protege endpoints)

## Instalar PWA
Android (Chrome):
1. Abrir el sitio con HTTPS.
2. Menú ⋮ → Instalar aplicación.

iOS (Safari):
1. Abrir el sitio con HTTPS.
2. Compartir → Añadir a pantalla de inicio.

## Probar modo offline
1. Abre la app al menos una vez con conexión.
2. DevTools → Application → Service Workers: confirma registro.
3. DevTools → Network: marca Offline.
4. Recarga y valida que la app abre.

## Respaldo
En Settings puedes:
- Exportar respaldo: descarga JSON con todas las tablas.
- Importar respaldo: reemplaza datos actuales (con confirmación).

## SQLite WASM
Persistencia principal en SQLite WASM (sql.js). La base se guarda en `localStorage` como binario exportado. Esto mantiene el motor SQLite como fuente principal y permite operar offline.

## IDs hash (PK)
Todas las tablas usan PK tipo hash (TEXT) generado por la app. El hash se crea con `deviceId` + campos del registro (por ejemplo nombre + fecha de creación) para evitar colisiones entre dispositivos.

Nota: el cambio a PK hash recrea las tablas locales (se pierde data previa en SQLite).

## Outbox y sincronización futura
Las operaciones críticas generan eventos en `outbox_events` con estado PENDING.  
Contrato en `api/contract.md` y endpoint placeholder en `api/sync/events.js`.

## Migraciones Postgres (endpoint protegido)
Si quieres crear las tablas en tu Postgres remoto desde la API:
1. Configura `DATABASE_URL` en Vercel.
2. Configura `SYNC_API_KEY` (recomendado).
3. Llama al endpoint:
   - `POST /api/admin/migrate` con header `x-api-key: <SYNC_API_KEY>`.
4. El esquema está en `api/schema.pg.sql`.

### PostgreSQL (futuro)
Cuando se implemente sync real:
- Usar Postgres (Neon o Supabase).
- API debería aplicar idempotencia por `event_id`.
- Los eventos PENDING se envían con retries desde `syncService`.
