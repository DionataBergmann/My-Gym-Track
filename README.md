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

3. Sync database schema:

```bash
npx prisma db push
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
- `next` -> shows the next pending set/exercise
- `log 40x10` -> logs current set
- `finish` -> closes active session

## WhatsApp Cloud API env vars

- `WHATSAPP_VERIFY_TOKEN`: webhook verification token
- `WHATSAPP_ACCESS_TOKEN`: permanent or temporary Cloud API token
- `WHATSAPP_PHONE_NUMBER_ID`: your WhatsApp Cloud phone number ID
- `WHATSAPP_API_VERSION`: default `v21.0`

## Next steps

- Import workout plans from PDF
- Add progression logic by previous sessions
