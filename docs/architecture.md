# Architecture

Four layers: **domain** (`types.ts`, `settings.ts`) → **repository** → **service** → **presentation** (`commands/`, `ui/`, `utils/events/`).

`AppContext` in `src/app-context.ts` wires repos once at plugin load and injects them into services. Commands and UI call services only; services call repo interfaces only.

Import rule: presentation → service → repository → domain. No reverse imports.
