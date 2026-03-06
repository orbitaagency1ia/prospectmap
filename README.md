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
- pdfjs-dist (extracción local de texto desde PDF)

## 1) Qué incluye ahora

- Registro/login con email y contraseña.
- Perfil de empresa (nombre + ciudad principal).
- Mapa principal con clustering de marcadores.
- Carga real de negocios por zona visible con Overpass.
- Rediseño UX/UI más premium:
  - navegación más clara,
  - mejor jerarquía visual,
  - ficha con tabs (`Informe`, `Datos`, `Notas`),
  - mejores previews en mapa,
  - mejor lectura de cards, badges y estados.
- Onboarding comercial guiado.
- Configuración comercial desde formulario estructurado + texto/PDF opcional.
- Perfil comercial de cuenta persistente en Supabase.
- Vista `Hoy` convertida en **Command Center** con:
  - negocios prioritarios del dia,
  - follow-ups pendientes,
  - negocios calientes,
  - sin contactar con alto potencial,
  - distribucion por servicio recomendado,
  - oportunidades por vertical/sector,
  - resumen accionable del pipeline.
- Ranking de prospectos ordenable por score.
- Sistema de **verticales operativas**:
  - Autoescuelas
  - Clinicas
  - Hoteles
  - General B2B
- Prospect Score 0-100 con logica visible, editable y persistida por cuenta.
- Scoring ampliado con ICP, oferta, ticket deseado, señales de necesidad y potencial.
- Siguiente mejor accion por negocio.
- Servicio Orbita recomendado por negocio.
- Mensajes sugeridos para apertura y seguimiento.
- Objeciones probables + respuesta corta sugerida.
- Informe detallado del negocio con:
  - resumen ejecutivo,
  - encaje,
  - riesgos,
  - CTA,
  - que revisar antes de contactar,
  - que no decir,
  - angulo comercial.
- Modo `Preparar prospeccion` para copiar playbook casi listo.
- Modo Barrido sobre la zona visible del mapa.
- Demo Mode profesional con badges comerciales y presentacion mas vendible.
- Ficha lateral (desktop) / bottom sheet (móvil) con:
  - edición de datos comerciales,
  - estado de prospección,
  - prioridad,
  - datos de decisor,
  - timeline de notas,
  - informe comercial,
  - score,
  - dolor principal detectado,
  - foco comercial,
  - acción recomendada,
  - servicio recomendado,
  - mensajes sugeridos,
  - objeciones y respuestas,
  - vertical efectiva por negocio,
  - acciones rápidas.
- Filtros combinables por sector, estado y prioridad.
- Importación CSV + geocodificación Nominatim + registro de errores.
- Dashboard con métricas y gráficos.
- Aislamiento multitenant por cuenta con RLS en Supabase.

## 2) Estructura principal

- `src/app/(auth)` login y registro.
- `src/app/(protected)` today, ranking, mapa, dashboard, settings, onboarding.
- `src/app/api/overpass` proxy Overpass + normalización + caché.
- `src/app/api/geocode/*` búsqueda de ciudad y geocodificación de direcciones.
- `src/components/commercial/*` persistencia de configuracion comercial, selectors y paneles de control.
- `src/components/layout/onboarding-workspace.tsx` onboarding de empresa + onboarding comercial.
- `src/components/map/*` mapa, ficha comercial, importador CSV.
- `src/components/prospects/*` command center, ranking, detalle comercial y UI de prospectos.
- `src/components/dashboard/*` cards y gráficos.
- `src/lib/commercial/account-profile.ts` saneado, persistencia local y resumen heurístico del perfil comercial.
- `src/lib/commercial/types.ts` tipos del dominio comercial.
- `src/lib/commercial/verticals.ts` configuracion centralizada de verticales, presets y librerias.
- `src/lib/commercial/scoring.ts` capa de scoring.
- `src/lib/commercial/recommendations.ts` capa de servicio recomendado, dolor, accion y canal.
- `src/lib/commercial/messaging.ts` mensajes sugeridos y demo badges.
- `src/lib/commercial/objections.ts` objeciones probables y respuestas.
- `src/lib/commercial/report.ts` resumen ejecutivo, checklist, CTA, riesgos y angulos comerciales.
- `src/lib/commercial/engine.ts` ensamblado final de insights y command center.
- `src/lib/prospect-intelligence.ts` facade/re-export del motor comercial.
- `src/lib/*` lógica de negocio (status, métricas, merge de negocios, clientes Supabase).
- `supabase/migrations/0001_init.sql` schema completo + RLS + triggers.
- `supabase/migrations/0002_phase3_commercial_settings.sql` migracion incremental para Phase 3 sobre proyectos ya creados.
- `supabase/migrations/0003_phase4_account_profiles.sql` migracion incremental para onboarding comercial y perfil de cuenta.

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
2. Ve a SQL Editor y ejecuta:
   - proyecto nuevo desde cero: `supabase/migrations/0001_init.sql`
   - proyecto ya existente con Phase 1/2: `supabase/migrations/0002_phase3_commercial_settings.sql` y despues `supabase/migrations/0003_phase4_account_profiles.sql`
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
- `account_settings`
- `account_profiles`

RLS:
- cada operación valida `auth.uid()` contra `id`/`user_id`.
- una empresa no puede leer ni modificar datos de otra.
- el estado comercial y notas siempre son privadas por cuenta.
- la configuracion comercial (vertical, demo mode, pesos y preferencias) tambien es privada por cuenta.
- el perfil comercial de cuenta (ICP, oferta, ticket, texto base y resumen estructurado) tambien es privado por cuenta.

Datos públicos (Overpass/OSM):
- solo se consumen para mostrar oportunidades.
- la capa comercial se guarda privada en Supabase.

## 6) Motor comercial y onboarding de cuenta

La fase actual convierte ProspectMap en un motor comercial determinista por capas, con perfil comercial real por cuenta y sin IA externa ni APIs de pago.

Capas:
- `scoring.ts`: calcula score 0-100 y desglose.
- `recommendations.ts`: detecta dolor principal, servicio recomendado, canal y siguiente accion.
- `messaging.ts`: construye mensaje inicial, follow-up 1, follow-up 2 y badges de demo.
- `objections.ts`: adjunta objeciones probables y su respuesta corta.
- `report.ts`: construye resumen ejecutivo, checklist, riesgos, CTA y angulo comercial.
- `engine.ts`: compone el insight final del negocio y resume el command center.

### Onboarding comercial

El onboarding ya no se limita a empresa + ciudad.

Ahora existe un segundo paso donde la cuenta puede definir:
- sector principal
- verticales y subsectores objetivo
- cliente ideal
- empresas que encajan / no encajan
- zonas geograficas
- oferta principal y secundaria
- problema principal que resuelve
- propuesta de valor
- objeciones tipicas
- canales preferidos
- estilo comercial
- CTA preferida
- checklist previo y cosas que no decir

Tambien puede subir:
- texto base
- `.txt`
- `.md`
- `.pdf`

El PDF/TXT se procesa localmente con `pdfjs-dist` y heuristicas simples para generar un resumen estructurado. No se usa IA de pago.

Archivos clave:
- `src/components/commercial/account-commercial-profile-form.tsx`
- `src/components/commercial/use-account-commercial-profile.ts`
- `src/lib/commercial/account-profile.ts`

### Perfil comercial de cuenta

Se guarda en `account_profiles` con una estructura simple pero extensible:
- `sector`
- `target_verticals`
- `target_subsectors`
- `ideal_customer_profile`
- `offer_profile`
- `pricing_profile`
- `prospecting_preferences`
- `knowledge_base_text`
- `knowledge_summary`
- `onboarding_completed`

### Verticales operativas

Verticales activas:
- `autoescuelas`
- `clinicas`
- `hoteles`
- `general_b2b`

Cada vertical influye en:
- pesos del scoring,
- foco comercial,
- servicio Orbita recomendado,
- mensajes sugeridos,
- objeciones probables,
- respuestas sugeridas.

Archivo central:
- `src/lib/commercial/verticals.ts`

El usuario puede cambiar vertical:
- globalmente por cuenta/demo,
- y por negocio mediante `businesses.vertical_override`.

### Prospect Score

El score se calcula entre `0` y `100` usando reglas transparentes y editables.

Factores incluidos:
- encaje sectorial,
- encaje con ICP,
- compatibilidad con la oferta,
- encaje de ticket,
- contactabilidad,
- hueco digital visible,
- acceso a decisor,
- prioridad interna,
- momento comercial segun estado,
- urgencia del follow-up,
- senal de necesidad,
- senal de potencial.

Penalizacion:
- `perdido` y `bloqueado` reducen fuertemente el score.

Etiquetas:
- `75+` = alta oportunidad
- `50-74` = media oportunidad
- `<50` = baja oportunidad

### Persistencia de configuracion

La configuracion comercial ya no vive solo en navegador.

Se persiste por cuenta en `account_settings`:
- `vertical`
- `demo_mode`
- `scoring_config`
- `commercial_preferences`

Comportamiento:
- intenta leer/escribir desde Supabase,
- si la tabla no existe todavia, hace fallback automatico a `localStorage`,
- el UI muestra si la configuracion esta en Supabase o solo en local.

Hook principal:
- `src/components/commercial/use-commercial-config.ts`
- `src/components/commercial/use-account-commercial-profile.ts`

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
- preferencias comerciales de la cuenta.
- perfil comercial de la cuenta.

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
- vertical efectiva y vertical de mercado detectada.
- compatibilidad con la oferta real declarada por la cuenta.

### Mensajes sugeridos

Cada ficha genera:
- mensaje inicial,
- follow-up 1,
- follow-up 2.

Se adaptan a:
- sector detectado,
- servicio recomendado,
- dolor comercial más probable del negocio.
- narrativa comercial de la cuenta.
- propuesta de valor y CTA declaradas por la cuenta.

### Objeciones probables

Cada vertical incorpora una libreria corta de objeciones y respuestas.

Objetivo:
- que el equipo sepa que ofrecer,
- que decir,
- y como responder sin depender de IA externa.

### Informe detallado del negocio

La ficha y el panel de detalle ahora muestran un informe comercial mucho mas util:
- resumen ejecutivo
- nivel de encaje
- score y oportunidad
- dolor principal
- servicio recomendado
- por que encaja
- riesgos y objeciones
- siguiente mejor accion
- mejor canal
- CTA sugerida
- que revisar antes de contactar
- que no decir
- angulo comercial recomendado

Tambien existe `Preparar prospeccion`, que abre un playbook listo para copiar y usar.

### Modo Barrido

- Funciona sobre la zona visible actual del mapa.
- Ordena negocios por score.
- Muestra servicio recomendado, siguiente accion, objeciones y guiones sugeridos.
- En esta fase no hay selección manual de polígono; solo zona visible para mantener simplicidad y coste cero.

### Demo Mode

Cuando `demo_mode` esta activo:
- se muestran badges como `Alta oportunidad`, `Encaja con avatar IA`, `Saturable por WhatsApp`, `Buena opcion para automatizacion` o `Seguimiento urgente`,
- la ficha, Hoy y Barrido cuentan mejor la historia comercial,
- no se rompe el funcionamiento real; solo añade capa de presentacion.

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

## 10) Dónde cambiar reglas, verticales y perfil comercial

Cambios mas importantes:
- verticales, textos, dolores, objeciones, boosts de servicio:
  - `src/lib/commercial/verticals.ts`
- calculo de score:
  - `src/lib/commercial/scoring.ts`
- accion, canal y servicio recomendado:
  - `src/lib/commercial/recommendations.ts`
- mensajes sugeridos y badges demo:
  - `src/lib/commercial/messaging.ts`
- objeciones y respuestas:
  - `src/lib/commercial/objections.ts`
- composicion final del insight:
  - `src/lib/commercial/engine.ts`
- resumen ejecutivo, CTA, checklist, riesgos y angulo:
  - `src/lib/commercial/report.ts`
- persistencia por cuenta:
  - `src/components/commercial/use-commercial-config.ts`
  - `src/lib/commercial/account-settings.ts`
- perfil comercial de cuenta:
  - `src/components/commercial/use-account-commercial-profile.ts`
  - `src/lib/commercial/account-profile.ts`

## 11) Qué queda preparado para escalar

- configuracion comercial por cuenta en tabla propia (`account_settings`)
- perfil comercial de cuenta en tabla propia (`account_profiles`)
- sistema de verticales centralizado y extensible
- separacion clara entre dominio comercial y UI
- override de vertical por negocio sin romper la vertical global
- motor determinista por capas facil de ampliar
- fallback local si la persistencia remota no esta disponible
- componentes reutilizables para mapa, ranking, command center y ficha
- onboarding reutilizable y ampliable
- capa de informe comercial preparada para enriquecerse en futuras fases

No se ha implementado todavia:
- multiusuario por empresa
- billing
- automatizaciones externas
- CRM completo
- integraciones con email o WhatsApp real

## 12) Limitaciones reales por usar solo servicios gratuitos

1. **Overpass** puede tardar o fallar en picos de uso (timeout/rate limit).
2. **Nominatim** exige ritmo bajo de peticiones y uso responsable.
3. Datos OSM no siempre traen telefono/email/web/sector completos.
4. Geocodificacion no es perfecta; algunas direcciones ambiguas fallaran.
5. Sin PostGIS ni motores premium, no hay analisis geoespacial avanzado.
6. El motor comercial sigue siendo determinista; no usa enrichment externo ni IA generativa.
7. El barrido funciona sobre la zona visible actual, no sobre poligonos dibujados.
8. La extraccion de PDF es local y heuristica; si el archivo viene mal estructurado, tocara revisar manualmente el texto resumido.

El código queda preparado para sustituir endpoints externos en el futuro sin romper el dominio principal.

## 13) Mejoras futuras recomendadas (no implementadas)

- tabla de historial de cambios de estado para auditoría exacta.
- cola de importación asíncrona para CSV grandes.
- deduplicación avanzada (fuzzy matching nombre+dirección).
- mapa con capas sectoriales predefinidas.
- búsquedas de texto completas sobre cartera.
- configuracion comercial multiusuario por empresa.
- barrido con selección manual de área en lugar de solo zona visible.
- librerias de objeciones y mensajes mas profundas por vertical.
- cuentas demo precargadas para presentaciones.

## 14) Comandos útiles

```bash
npm run dev
npm run lint
npm run build
npm run start
```
