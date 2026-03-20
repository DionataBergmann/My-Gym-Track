# My Gym Track API

NestJS backend for gym workout tracking with WhatsApp webhook support.

## Free-first architecture

- **Framework**: NestJS
- **Database**: SQLite with Prisma (zero cost to start)
- **Webhook**: WhatsApp Cloud API compatible endpoint
- **Deployment (later)**: Render/Railway free tier or any VPS

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
copy .env.example .env
```

3. Run Prisma migration:

```bash
npm run prisma:migrate -- --name init
```

4. Start in dev mode:

```bash
npm run start:dev
```

## Endpoints

- `GET /health`
- `POST /workouts/sessions/start`
- `POST /workouts/sessions/log-set`
- `GET /workouts/sessions/:id`
- `PATCH /workouts/sessions/:id/finish`
- `GET /webhooks/whatsapp` (Meta webhook verification)
- `POST /webhooks/whatsapp` (incoming message handling)

## WhatsApp command example

- `start chest` -> starts a session for chest muscle group

## Next steps

- Implement real WhatsApp outgoing messages (Cloud API call)
- Import workout plans from PDF
- Add progression logic by previous sessions
