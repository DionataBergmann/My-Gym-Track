# My Gym Track API

NestJS backend for gym workout tracking with WhatsApp webhook support.

## Free-first architecture

- **Framework**: NestJS
- **Database**: SQLite with Prisma (zero cost to start)
- **Webhook**: Twilio WhatsApp Sandbox compatible endpoint
- **Deployment**: Render (see below). SQLite on free tier is **ephemeral** (data can reset on redeploy); use PostgreSQL later for persistence.

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
- `POST /workouts/plans`
- `GET /workouts/plans/:phone`
- `POST /workouts/sessions/start`
- `POST /workouts/sessions/log-set`
- `GET /workouts/sessions/:id`
- `PATCH /workouts/sessions/:id/finish`
- `POST /webhooks/whatsapp` (Twilio inbound webhook, responds with TwiML)

## WhatsApp command example

- `start chest` -> starts a session for chest muscle group
- `next` -> shows the next pending set/exercise
- `log 40x10` -> logs current set
- `finish` -> closes active session

## Twilio WhatsApp Sandbox setup

1. Create a Twilio account and open the WhatsApp Sandbox page.
2. Join the sandbox from your phone (send the join code in WhatsApp).
3. Set Sandbox "When a message comes in" webhook to:
   - `https://<public-url>/webhooks/whatsapp`
4. Use a tunnel for local development (Cloudflare Tunnel or ngrok).

### Twilio env vars

- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `TWILIO_AUTH_TOKEN`: Twilio auth token
- `TWILIO_WHATSAPP_SANDBOX_NUMBER`: default sandbox sender number

## Create a workout plan (required before `start`)

Example request:

```json
{
  "userPhone": "5553999998888",
  "name": "Chest Day A",
  "muscleGroup": "chest",
  "exercises": [
    { "exerciseName": "Bench Press", "orderIndex": 1, "targetSets": 4, "targetReps": 8, "restSeconds": 90 },
    { "exerciseName": "Incline Dumbbell Press", "orderIndex": 2, "targetSets": 3, "targetReps": 10, "restSeconds": 75 }
  ]
}
```

## Seed default plans

Run once to create Upper/Lower plans:

```bash
npm run seed
```

Optional custom phone:

```bash
SEED_USER_PHONE=5553999998888 npm run seed
```

## Deploy on Render

1. Push this repo to GitHub.
2. In [Render](https://render.com): **New +** → **Blueprint** → connect repo → select `render.yaml`, or **Web Service** manually:
   - **Build command:** `npm install && npx prisma generate && npm run build`
   - **Start command:** `npx prisma db push && npm run start`
3. **Environment variables** (dashboard):
   - `DATABASE_URL` = `file:./prisma/render.db` (default in blueprint)
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_SANDBOX_NUMBER`
   - `SEED_USER_PHONE` = your WhatsApp number **digits only** (e.g. `5553984332609`)
4. After first successful deploy, open **Shell** on the service and run once:
   - `npm run seed`  
   (uses `SEED_USER_PHONE` from env)
5. In Twilio Sandbox, set **When a message comes in** to:
   - `https://<your-render-service>.onrender.com/webhooks/whatsapp`  
   Method: **HTTP POST**

## Next steps

- Import workout plans from PDF
- Add progression logic by previous sessions
- Optional: migrate to PostgreSQL on Render for durable data
