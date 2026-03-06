# ProspectMap

ProspectMap es un SaaS de prospección B2B sobre mapa construido para **coste 0 / casi 0** con:
- Next.js (App Router + TypeScript)
- Tailwind CSS
- Supabase (Auth + PostgreSQL + RLS)
- Leaflet + OpenStreetMap tiles
- Overpass API (negocios reales)
- Nominatim (geocodificación)
- Recharts (dashboard)
- Papaparse (importación CSV)

## 1) Qué incluye ahora

- Registro/login con email y contraseña.
- Perfil de empresa (nombre + ciudad principal).
- Mapa principal con clustering de marcadores.
- Carga real de negocios por zona visible con Overpass.
- Vista `Hoy` con:
  - negocios prioritarios del día,
  - follow-ups pendientes,
  - negocios calientes,
  - sin contactar con alto potencial.
- Ranking de prospectos ordenable por score.
- Prospect Score 0-100 con lógica visible y editable.
- Siguiente mejor acción por negocio.
- Servicio Orbita recomendado por negocio.
- Mensajes sugeridos para apertura y seguimiento.
- Modo Barrido sobre la zona visible del mapa.
- Ficha lateral (desktop) / bottom sheet (móvil) con:
  - edición de datos comerciales,
  - estado de prospección,
  - prioridad,
  - datos de decisor,
  - timeline de notas,
  - score,
  - acción recomendada,
  - servicio recomendado,
  - mensajes sugeridos.
- Filtros combinables por sector, estado y prioridad.
- Importación CSV + geocodificación Nominatim + registro de errores.
- Dashboard con métricas y gráficos.
- Aislamiento multitenant por cuenta con RLS en Supabase.

## 2) Estructura principal

- `src/app/(auth)` login y registro.
- `src/app/(protected)` today, ranking, mapa, dashboard, settings, onboarding.
- `src/app/api/overpass` proxy Overpass + normalización + caché.
- `src/app/api/geocode/*` búsqueda de ciudad y geocodificación de direcciones.
- `src/components/map/*` mapa, ficha comercial, importador CSV.
- `src/components/prospects/*` vista Hoy, ranking, detalle comercial y controles del score.
- `src/components/dashboard/*` cards y gráficos.
- `src/lib/prospect-intelligence.ts` motor de score, servicio recomendado, acción y mensajes.
- `src/lib/*` lógica de negocio (status, métricas, merge de negocios, clientes Supabase).
- `supabase/migrations/0001_init.sql` schema completo + RLS + triggers.

## 3) Configuración local

### Requisitos
- Node.js 20+
- npm 10+
- cuenta gratuita de Supabase

### Pasos
1. Copia variables:
   ```bash
   cp .env.example .env.local
   ```
2. Rellena `.env.local` con tu URL y anon key de Supabase.
3. Instala dependencias:
   ```bash
   npm install
   ```
4. Arranca en local:
   ```bash
   npm run dev
   ```
5. Abre [http://localhost:3000](http://localhost:3000)

La app abrirá directamente en `/today`.

## 4) Configuración de Supabase (obligatoria)

1. Crea un proyecto en Supabase Free.
2. Ve a SQL Editor y ejecuta completo:
   - `supabase/migrations/0001_init.sql`
3. En Authentication > Providers:
   - Email activado.
4. En Authentication > URL Configuration:
   - añade `http://localhost:3000` para local.
5. Opcional recomendado para pruebas rápidas MVP:
   - desactivar confirmación de email (si quieres entrar justo tras registro).

## 5) Modelo de datos y privacidad

Tablas implementadas:
- `profiles`
- `businesses`
- `business_notes`
- `csv_import_errors`

RLS:
- cada operación valida `auth.uid()` contra `id`/`user_id`.
- una empresa no puede leer ni modificar datos de otra.
- el estado comercial y notas siempre son privadas por cuenta.

Datos públicos (Overpass/OSM):
- solo se consumen para mostrar oportunidades.
- la capa comercial se guarda privada en Supabase.

## 6) Motor comercial Fase 2

### Prospect Score

El score se calcula entre `0` y `100` usando reglas transparentes y deterministas, sin IA externa ni APIs de pago.

Factores incluidos:
- encaje sectorial,
- contactabilidad,
- hueco digital visible,
- acceso a decisor,
- prioridad interna,
- momento comercial según estado,
- urgencia del follow-up.

Penalización:
- `perdido` y `bloqueado` reducen fuertemente el score.

Etiquetas:
- `75+` = alta oportunidad
- `50-74` = media oportunidad
- `<50` = baja oportunidad

### Lógica editable

- Las reglas del score se pueden ajustar desde `Hoy` y `Ranking`.
- Los pesos se guardan en `localStorage` del navegador.
- Decisión técnica: se guarda en navegador para evitar migraciones extra y mantener coste cero en esta fase.

### Siguiente mejor acción

Cada negocio recibe:
- acción recomendada,
- canal sugerido,
- motivo,
- urgencia.

La recomendación depende de:
- estado actual,
- antigüedad de la última interacción,
- disponibilidad de canales de contacto,
- score total.

### Servicio Orbita recomendado

Servicios contemplados:
- asistente/agente multicanal,
- automatización interna,
- vídeos con avatar IA,
- SaaS a medida.

La recomendación se basa en heurísticas baratas y transparentes:
- tipo de sector,
- señales operativas (horarios, teléfono, web, decisor),
- madurez comercial del lead.

### Mensajes sugeridos

Cada ficha genera:
- mensaje inicial,
- follow-up 1,
- follow-up 2.

Se adaptan a:
- sector detectado,
- servicio recomendado,
- dolor comercial más probable del negocio.

### Modo Barrido

- Funciona sobre la zona visible actual del mapa.
- Ordena negocios por score.
- Muestra servicio recomendado, siguiente acción y guiones sugeridos.
- En esta fase no hay selección manual de polígono; solo zona visible para mantener simplicidad y coste cero.

## 7) Dashboard y fórmulas usadas

- **Total prospectados**: estado distinto de `sin_contactar`.
- **Tasa de contacto**: `contactado o superior / (intento_contacto + estados posteriores)`.
- **Tasa de respuesta**: `reunion_agendada o superior / contactado o superior`.
- **Tasa de éxito**: `ganado / total prospectados`.

Gráficos:
- embudo por estado,
- distribución por estado,
- evolución temporal (30 días por `updated_at`),
- distribución por sector,
- actividad reciente (notas + actualizaciones).

## 8) CSV import

Campos esperados:
- obligatorios: `nombre`, `direccion`
- opcionales: `telefono`, `email`, `sector`, `contacto`, `notas`, `ciudad`

Comportamiento:
- parsea CSV,
- geocodifica fila a fila con Nominatim,
- inserta negocios válidos,
- registra fallos en `csv_import_errors`,
- muestra resumen (ok/errores/ignorados).

Límite MVP por importación: **150 filas** para respetar APIs gratuitas.

## 9) Despliegue en Vercel + Supabase Free

1. Sube este proyecto a GitHub.
2. En Vercel: Import Project.
3. Define variables de entorno de `.env.example` en Vercel.
4. Deploy.
5. En Supabase Auth URL Configuration añade tu dominio de Vercel.

No se requiere backend separado ni infraestructura adicional.

## 10) Limitaciones reales por usar solo servicios gratuitos

1. **Overpass** puede tardar o fallar en picos de uso (timeout/rate limit).
2. **Nominatim** exige ritmo bajo de peticiones y uso responsable.
3. Datos OSM no siempre traen teléfono/email/web/sector completos.
4. Geocodificación no es perfecta; algunas direcciones ambiguas fallarán.
5. Sin PostGIS ni motores premium, no hay análisis geoespacial avanzado.
6. El score editable se guarda por navegador, no todavía por usuario en Supabase.

El código queda preparado para sustituir endpoints externos en el futuro sin romper el dominio principal.

## 11) Mejoras futuras recomendadas (no implementadas)

- tabla de historial de cambios de estado para auditoría exacta.
- cola de importación asíncrona para CSV grandes.
- deduplicación avanzada (fuzzy matching nombre+dirección).
- mapa con capas sectoriales predefinidas.
- búsquedas de texto completas sobre cartera.
- persistencia del scoring config en Supabase por cuenta.
- barrido con selección manual de área en lugar de solo zona visible.

## 12) Comandos útiles

```bash
npm run dev
npm run lint
npm run build
npm run start
```
