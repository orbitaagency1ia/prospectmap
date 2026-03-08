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
  - navegación con naming más comercial (`Centro de control`, `Territorio`, `Prioridades`, `Pipeline`, `Configuración`),
  - nueva paleta premium grafito + naranja eléctrico (`#0A0B0F`, `#101217`, `#171B22`, `#1D222B`, `#252C36`, `#EF8B35`),
  - mejor jerarquía visual, aire y contraste entre capas,
  - paneles, overlays y sheets con superficies mucho más refinadas,
  - microinteracciones y motion suave en botones, tabs, métricas y paneles,
  - escritorio más editorial y menos rígido,
  - móvil más cómodo, con sheets, cards y navegación mejor resueltos,
  - ficha con tabs (`Informe`, `Datos`, `Notas`),
  - mejores previews en mapa,
  - mejor lectura de cards, badges y estados.
- Nuevo modulo `Ataque` / Attack Workspace con:
  - cola diaria de leads,
  - filtros por ciudad, vertical, campaña, servicio, urgencia y zona,
  - sesion de ataque persistente,
  - briefing operativo del lead,
  - registro rapido de resultado,
  - siguiente paso recomendado,
  - progreso y KPIs de ejecucion,
  - atajos de teclado para ejecutar mas rapido (`Ctrl/Cmd + Enter`, `J/K`, `S`, `D`, `P`, `E`).
- Onboarding comercial guiado.
- Configuración comercial desde formulario estructurado + texto/PDF opcional.
- Perfil comercial de cuenta persistente en Supabase.
- Vista `Hoy` convertida en **Centro de control** con:
  - negocios prioritarios del dia,
  - follow-ups pendientes o vencidos,
  - negocios calientes,
  - sin contactar con alto potencial,
  - distribucion por servicio recomendado,
  - oportunidades por vertical/sector,
  - resumen accionable del pipeline,
  - valor bruto y valor ponderado.
- Vista `Pipeline` de cierre con:
  - estados claros,
  - valor estimado por oportunidad,
  - valor ponderado del pipeline,
  - días sin tocar,
  - oportunidades enfriándose,
  - cierre cercano.
- Vista `Prioridades` ordenable por score.
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
  - angulo comercial,
  - bloque `Por qué atacarlo`,
  - valor estimado.
- Modo `Preparar prospeccion` para copiar playbook casi listo.
- Modo Barrido sobre la zona visible del mapa.
- Señales destacadas integradas:
  - alta oportunidad,
  - buen encaje por servicio,
  - urgencia comercial,
  - foco de ataque.
- Ficha lateral (desktop) / bottom sheet (móvil) con:
  - edición de datos comerciales,
  - estado de prospección,
  - prioridad,
  - siguiente follow-up,
  - datos de decisor,
  - timeline comercial unificado (notas + eventos),
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
- Recordatorios y caducidad:
  - `next_follow_up_at` por negocio,
  - leads sin tocar,
  - oportunidades enfriándose.
- Valor económico estimado por negocio, pipeline y listas.
- Listas/campañas operativas persistentes con progreso y foco comercial.
- Filtros combinables por sector, estado y prioridad.
- Importación CSV + geocodificación Nominatim + registro de errores.
- Dashboard con métricas y gráficos.
- Aislamiento multitenant por cuenta con RLS en Supabase.

## 2) Estructura principal

- `src/app/(auth)` login y registro.
- `src/app/(protected)` today, attack, ranking, pipeline, mapa, dashboard, settings, onboarding.
- `src/app/api/overpass` proxy Overpass + normalización + caché.
- `src/app/api/geocode/*` búsqueda de ciudad y geocodificación de direcciones.
- `src/components/commercial/*` persistencia de configuracion comercial, selectors y paneles de control.
- `src/components/attack/*` Attack Workspace, hook de sesiones y flujo de ejecución diaria.
- `src/components/layout/onboarding-workspace.tsx` onboarding de empresa + onboarding comercial.
- `src/components/map/*` mapa, ficha comercial, importador CSV.
- `src/components/prospects/*` command center, ranking, detalle comercial y UI de prospectos.
- `src/components/dashboard/*` cards y gráficos.
- `src/components/ui/pm.tsx` primitivas del design system interno (`PmPanel`, `PmHero`, `PmMetric`, `PmBadge`, `PmNotice`, `PmEmpty`, `PmSectionHeader`).
- `src/app/globals.css` tokens visuales, capas, motion, superficies y estilos base reutilizables.
- `src/lib/commercial/account-profile.ts` saneado, persistencia local y resumen heurístico del perfil comercial.
- `src/lib/commercial/business-events.ts` helper de registro de actividad comercial (`business_events`) con fallback seguro.
- `src/lib/commercial/types.ts` tipos del dominio comercial.
- `src/lib/commercial/verticals.ts` configuracion centralizada de verticales, presets y librerias.
- `src/lib/commercial/scoring.ts` capa de scoring.
- `src/lib/commercial/valuation.ts` valor económico estimado y probabilidad de cierre.
- `src/lib/commercial/pipeline.ts` recordatorios, caducidad y lectura de pipeline.
- `src/lib/commercial/attack.ts` cola diaria, sesion, razones de prioridad y siguiente paso.
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
- `supabase/migrations/0004_phase5_pipeline_lists.sql` migracion incremental para follow-ups y listas/campañas.
- `supabase/migrations/0005_fix_missing_account_settings.sql` reparacion idempotente para proyectos donde falta `account_settings` o el trigger de alta de usuario quedó roto.
- `supabase/migrations/0006_attack_workspace.sql` migracion incremental para sesiones de ataque y registro de resultados.
- `supabase/migrations/0007_business_events.sql` migracion incremental para timeline comercial unificado y actividad reciente por eventos.

## 2.1) Sistema visual y UX

La fase actual deja una base visual más seria y reutilizable sin cambiar la arquitectura del producto.

Paleta principal:
- fondo base `#0A0B0F`
- fondo secundario `#101217`
- superficie `#171B22`
- superficie terciaria `#1D222B`
- superficie flotante `rgba(20, 24, 31, 0.74)`
- borde sutil `rgba(247, 236, 220, 0.075)`
- borde fuerte `rgba(247, 236, 220, 0.14)`
- texto principal `#F6F1E8`
- texto secundario `#C7BCAE`
- texto tenue `#8F877B`
- acento `#EF8B35`
- hover acento `#F6A24C`
- éxito `#4EC086`
- advertencia `#DDAE55`
- riesgo `#D76F7B`
- info neutra `#9A93AF`

Decisiones de diseño:
- menos aspecto de dashboard genérico y más sensación de sistema operativo comercial,
- paneles con mejor profundidad, bordes suaves y elevación sutil,
- tipografía y spacing más consistentes entre vistas,
- badges y estados comerciales más legibles,
- mapas, sheets y paneles laterales más refinados,
- mejor ergonomía móvil sin meter complejidad funcional nueva.

Componentes más rehechos visualmente:
- `Centro de control`
- `Territorio`
- `Prioridades`
- `Pipeline`
- `Analítica`
- `Configuración`
- `Onboarding`
- ficha de negocio
- hoja `Preparar prospección`
- diálogos y overlays como CSV, barrido y conquista

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
   - proyecto ya existente con Phase 1/2: `supabase/migrations/0002_phase3_commercial_settings.sql`, despues `supabase/migrations/0003_phase4_account_profiles.sql`, despues `supabase/migrations/0004_phase5_pipeline_lists.sql`, despues `supabase/migrations/0006_attack_workspace.sql` y despues `supabase/migrations/0007_business_events.sql`
   - si la UI muestra `Error guardando` en configuracion comercial o el registro devuelve `Database error saving new user`: ejecuta `supabase/migrations/0005_fix_missing_account_settings.sql`
3. En Authentication > Providers:
   - Email activado.
4. En Authentication > URL Configuration:
   - añade `http://localhost:3000` para local.
5. Para acceso directo con contraseña (sin validación manual):
   - desactiva `Confirm email` en Authentication > Providers > Email.

## 5) Modelo de datos y privacidad

Tablas implementadas:
- `profiles`
- `businesses`
- `business_notes`
- `csv_import_errors`
- `account_settings`
- `account_profiles`
- `prospect_lists`
- `prospect_list_items`
- `attack_sessions`
- `attack_session_items`
- `attack_results`
- `business_events`

RLS:
- cada operación valida `auth.uid()` contra `id`/`user_id`.
- una empresa no puede leer ni modificar datos de otra.
- el estado comercial y notas siempre son privadas por cuenta.
- la configuracion comercial (vertical, pesos y preferencias; el flag de presentacion sigue interno) tambien es privada por cuenta.
- el perfil comercial de cuenta (ICP, oferta, ticket, texto base y resumen estructurado) tambien es privado por cuenta.
- las listas/campañas y sus elementos tambien son privadas por cuenta.
- las sesiones de ataque y sus resultados tambien son privadas por cuenta.
- los eventos comerciales y el timeline tambien son privados por cuenta.

Datos públicos (Overpass/OSM):
- solo se consumen para mostrar oportunidades.
- la capa comercial se guarda privada en Supabase.

## 6) Motor comercial y onboarding de cuenta

La fase actual convierte ProspectMap en un motor comercial determinista por capas, con perfil comercial real por cuenta y sin IA externa ni APIs de pago.

Capas:
- `scoring.ts`: calcula score 0-100 y desglose.
- `recommendations.ts`: detecta dolor principal, servicio recomendado, canal y siguiente accion.
- `messaging.ts`: construye mensaje inicial, follow-up 1, follow-up 2 y señales destacadas.
- `objections.ts`: adjunta objeciones probables y su respuesta corta.
- `report.ts`: construye resumen ejecutivo, checklist, riesgos, CTA y angulo comercial.
- `valuation.ts`: estima valor bruto, valor ponderado y probabilidad de cierre.
- `pipeline.ts`: decide seguimiento vencido, enfriamiento y foto del pipeline.
- `engine.ts`: compone el insight final del negocio y resume centro de control + pipeline.

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
- `demo_mode` (interno; ya no aparece como control visible principal)
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
- urgencia,
- valor económico estimado,
- probabilidad de cierre,
- estado de atención (`seguimiento vencido`, `oportunidad enfriándose`, etc.).

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
- prioridad comercial y oportunidad
- dolor principal
- servicio recomendado
- por que encaja
- por que atacarlo
- riesgos y objeciones
- siguiente mejor accion
- mejor canal
- valor estimado y ponderado
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

### Pipeline, recordatorios y listas

La fase actual añade una capa orientada a cierre y uso diario:
- `Pipeline` con valor bruto, valor ponderado y oportunidades por estado.
- `next_follow_up_at` por negocio para seguimiento real.
- deteccion de leads enfriandose por dias sin tocar y estado actual.
- listas/campañas guardadas (`prospect_lists`, `prospect_list_items`) para reutilizar focos de prospeccion.
- progreso por lista basado en leads trabajados.

### Attack Workspace

ProspectMap ya no solo detecta y prioriza. Ahora tambien ejecuta.

La vista `Ataque` funciona como sistema operativo diario para prospeccion activa:
- monta una cola de leads del dia,
- permite arrancar una sesion de trabajo real,
- muestra un briefing operativo escaneable,
- registra el resultado en segundos,
- y deja el siguiente paso recomendado listo.

#### Como funciona la cola diaria

- parte de negocios ya guardados en la cuenta.
- cruza score, urgencia, follow-up, valor ponderado, vertical, servicio y contexto de entrada.
- puede arrancarse desde:
  - `Centro de control` (alertas),
  - `Prioridades`,
  - `Pipeline`,
  - `Campañas`,
  - `Territorio` sobre la zona visible.
- cada entrada muestra:
  - nombre,
  - sector,
  - score,
  - urgencia,
  - servicio recomendado,
  - siguiente accion,
  - valor estimado,
  - estado,
  - por que entra hoy.

#### Como funciona la sesion

- al pulsar `Empezar sesion`, ProspectMap crea una sesion persistente con los mejores leads del foco actual.
- guarda:
  - origen de la sesion,
  - filtros aplicados,
  - orden de cola,
  - razon de inclusion,
  - zona,
  - estado de cada item.
- permite:
  - trabajar ahora,
  - saltar,
  - mover al final,
  - fijar para hoy,
  - marcar no relevante,
  - pausar o cerrar la sesion.

#### Como funciona el briefing

Cada lead abierto en `Ataque` muestra una version operativa del informe:
- resumen ejecutivo,
- por que atacarlo,
- dolor principal,
- servicio recomendado,
- angulo comercial,
- mensaje inicial,
- follow-up 1,
- follow-up 2,
- objeciones probables,
- que revisar antes,
- que no decir,
- valor estimado y urgencia.

#### Como se registra el resultado

El bloque de resultado permite marcar:
- no contactado
- contacto intentado
- hablo con alguien
- interesado
- reunion conseguida
- propuesta pendiente
- no encaja
- perdido
- volver mas tarde

Ademas permite:
- nota rapida,
- fecha de follow-up,
- cambio de prioridad,
- mover a pipeline,
- añadir a campaña,
- sacar del foco.

El guardado actualiza:
- `businesses.prospect_status`
- `businesses.priority`
- `businesses.last_contact_at`
- `businesses.next_follow_up_at`
- notas en `business_notes`
- resultado de ataque en `attack_results`
- evento comercial en `business_events` (resultado, cambio de estado, prioridad y follow-up)
- estado del item dentro de la sesion

#### Siguiente paso recomendado

Tras elegir resultado, ProspectMap propone automaticamente el siguiente movimiento:
- reintentar mañana,
- follow-up en 2 dias,
- subir prioridad,
- mover a pipeline,
- cerrar y sacar del foco,
- revisar mas tarde.

El usuario puede aceptar la sugerencia o sobrescribirla manualmente.

#### Integracion con el resto del producto

- `Centro de control` envia alertas al modulo `Ataque`.
- `Prioridades` abre una sesion centrada en score y valor.
- `Pipeline` abre una sesion orientada a seguimiento y cierre.
- `Campañas` permiten trabajar una lista guardada como sesion.
- `Territorio` lanza `Ataque` sobre la zona visible del mapa.

#### Tablas nuevas

- `attack_sessions`: cabecera de sesion.
- `attack_session_items`: cola persistida de negocios por sesion.
- `attack_results`: resultado registrado tras trabajar cada lead.
- `business_events`: timeline comercial de cambios, resultados y seguimiento.

#### Atajos de teclado en Ataque

- `Ctrl/Cmd + Enter`: guardar resultado del lead en foco.
- `J` / `K`: siguiente o anterior lead en la cola.
- `S`: saltar lead (si esta en sesion).
- `D`: descartar lead rapido.
- `P`: fijar o desfijar lead para hoy (si esta en sesion).
- `E`: mover lead al final de la cola (si esta en sesion).

## 7) Dashboard y fórmulas usadas

- **Total prospectados**: estado distinto de `sin_contactar`.
- **Tasa de contacto**: `contactado o superior / (intento_contacto + estados posteriores)`.
- **Tasa de respuesta**: `reunion_agendada o superior / contactado o superior`.
- **Tasa de éxito**: `ganado / total prospectados`.

Gráficos:
- embudo por estado,
- distribución por estado,
- evolución temporal (30 días por `updated_at` + eventos comerciales),
- distribución por sector,
- actividad reciente (eventos + notas + actualizaciones).

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
- valor económico y probabilidad:
  - `src/lib/commercial/valuation.ts`
- pipeline, atención y caducidad:
  - `src/lib/commercial/pipeline.ts`
- accion, canal y servicio recomendado:
  - `src/lib/commercial/recommendations.ts`
- mensajes sugeridos y señales destacadas:
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
- listas/campañas por cuenta con RLS (`prospect_lists`, `prospect_list_items`)
- sesiones de ataque y resultados por cuenta con RLS (`attack_sessions`, `attack_session_items`, `attack_results`)
- sistema de verticales centralizado y extensible
- separacion clara entre dominio comercial y UI
- override de vertical por negocio sin romper la vertical global
- motor determinista por capas facil de ampliar
- capa de valoración y pipeline separada del scoring
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
