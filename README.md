# CAREPILOT



Plateforme interne d’assistance opérationnelle (Front Office VLP) : synchronisation depuis un simulateur CARE (`care_source.*`), enrichissement dans `carepilot.*`, recherche sémantique PostgreSQL + pgvector, et UI type console ITSM.



## Prérequis



- [Bun](https://bun.sh/) (ou Node équivalent)

- Docker (PostgreSQL + pgvector via `docker-compose.yml`)



## Démarrage base de données



```bash

docker compose up -d

cp .env.example .env.local   # recommandé ; sinon scripts → URL Docker par défaut (voir ci‑dessous)

bun run db:ping

bun run db:init

bun run db:seed

```



Sans `.env` / `.env.local` ou sans `DATABASE_URL`, les scripts utilisent **`postgresql://carepilot:carepilot@localhost:5433/carepilot`** (port hôte du compose). Le conteneur écoute sur **5433** côté machine hôte pour éviter les conflits avec un PostgreSQL système souvent déjà sur **5432** (cas fréquent sous Windows). Ajoutez `.env.local` pour surcharger.

### Docker : création de la base et Drizzle

Au **premier** `docker compose up -d`, l’image Postgres crée automatiquement :

- utilisateur : `carepilot`
- mot de passe : `carepilot`
- **base de données** : `carepilot` (`POSTGRES_DB`)

Tu n’as pas besoin de créer la base à la main sauf si tu veux une base **supplémentaire** (alors `docker exec -it carepilot-postgres psql -U carepilot -d postgres -c "CREATE DATABASE ..."`).

**Connexion Drizzle** : le même `DATABASE_URL` sert à l’app ([`lib/db/index.ts`](lib/db/index.ts)) et à Drizzle Kit ([`drizzle.config.ts`](drizzle.config.ts), qui charge `.env` / `.env.local` comme les scripts).

Commandes utiles (conteneur déjà démarré, schéma SQL appliqué avec `db:init` ou aligné avec Drizzle) :

| Commande | Rôle |
|----------|------|
| `bun run db:ping` | Vérifie que Postgres répond |
| `bun run db:push` | Pousse le schéma défini dans `lib/db/schema/*.ts` vers la base |
| `bun run db:studio` | UI Drizzle Studio sur cette base |
| `bun run db:generate` | Génère des fichiers SQL de migration dans `./drizzle` |

En pratique MVP : **`docker compose up -d`** puis **`DATABASE_URL=…5433/carepilot`** dans `.env` / `.env.local`, puis **`bun run db:init`** (DDL + extension `vector`) avant **`db:seed`**.

La seed génère par défaut **520 tickets synthétiques anonymisés** (variable `SEED_TICKET_COUNT` pour ajuster).



### Checklist démo (flux nominal)



1. **Docker** : `docker compose up -d`

2. **Schéma** : `bun run db:init`

3. **Données simulateur** : `bun run db:seed`

4. **Application** : `bun run dev`

5. **Sync CARE → CAREPILOT** : appeler `POST /api/sync/care` en boucle jusqu’à `pendingRemaining: 0` (batch limité, voir ci‑dessous).

6. **Parcours UI** : `/dashboard` puis `/tickets` → ouvrir un ticket (`/tickets/[id]`) : analyse, similaires, KM, escalade & transfert, timeline.

7. **Benchmarks (optionnel)** : `bun run db:seed:golden` puis `/benchmarks` ou `bun run benchmark:eval`.



### Schéma et Drizzle



- La vérité DDL locale est `sql/init.sql` (`db:init`).

- Optionnel : aligner un environnement de dev avec `bun run db:push`, ou générer des fichiers de migration avec `bun run db:generate` (`DATABASE_URL` + `drizzle.config.ts`), sans remplacer l’initialisation Docker décrite ci‑dessus.



### Benchmarks (golden set)



Après synchronisation complète des tickets :



```bash

bun run db:seed:golden

bun run benchmark:eval

```



Les métriques rapportées sont volontairement **plafonnées à 95 %** dans le moteur de rapport (réalisme académique).



### Tests



```bash

bun test tests

```



Smoke Postgres optionnel : `RUN_INTEGRATION=1` et `DATABASE_URL` pointant vers une instance joignable.



## Synchronisation CARE → CAREPILOT



```bash

curl -X POST http://localhost:3000/api/sync/care

```



Le traitement est **par batch** (`CARE_SYNC_BATCH_LIMIT`, défaut **80**) pour limiter les timeouts ; répétez l’appel jusqu’à `pendingRemaining: 0`.



Chaque ticket synchronisé déclenche le pipeline : analyse → embedding pgvector → tickets similaires → reco KM → suggestion escalade & transfert → mise à jour des agrégats consultables au **dashboard**.



## Application Next.js



```bash

bun run dev

```



- `/dashboard` — métriques agrégées (PostgreSQL)

- `/tickets` et `/tickets/[id]` — file et détail (timeline, reco, escalade/transfert, override agent)

- `/sync`, `/km`, `/escalation-transfer`, `/benchmarks`, `/settings`



## API principales



Réponses d’erreur homogènes : `{ "ok": false, "error": "…" }` (HTTP 4xx/5xx selon route).



- `POST /api/sync/care` — sync batch ; corps de réponse inchangé (`ok`, `imported`, `updated`, `pendingRemaining`, …).

- `POST /api/tickets/analyze` · `POST /api/tickets/similar` · `POST /api/km/recommend` · `POST /api/decision/assist` — corps `{ "ticketId": number }` ; succès `{ "ok": true, "ticketId", "stage": "…" }`.

- `GET /api/dashboard/metrics` — `{ "ok": true, …métriques }` (backlog, `ticketsByStatus`, dernier sync, etc.).

- `GET /api/benchmarks/report` — `{ "ok": true, "report": { … } }` (métriques, matrices, precision@k).

- `PATCH /api/tickets/[id]/decision` — décision agent manuelle `{ "agentFinalDecision": "…", "notes"? }`.



## shadcn/ui



Ajout de composants :



```bash

npx shadcn@latest add button

```


