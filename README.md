# Gym Tracker API

REST API para rastrear cargas, séries e progressão na academia. Construída com **NestJS** + **Prisma** + **PostgreSQL**.

## Stack

- **Node.js** + **NestJS**
- **Prisma ORM** (PostgreSQL)
- **JWT** para autenticação
- **Swagger** em `/docs`
- **Docker Compose** para desenvolvimento local

## Início rápido

```bash
# 1. Copie as variáveis de ambiente
cp .env.example .env

# 2. Suba o banco de dados
docker compose up -d db

# 3. Instale as dependências
npm install --legacy-peer-deps

# 4. Execute as migrations
npm run prisma:migrate

# 5. Inicie em modo dev
npm run start:dev
```

A API ficará disponível em `http://localhost:3000` e o Swagger em `http://localhost:3000/docs`.

## Módulos

### Auth
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Criar conta |
| POST | `/auth/login` | Login e obter JWT |

### Users
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/users/me` | Meu perfil |
| PATCH | `/users/me` | Atualizar nome ou senha |

### Exercises (catálogo pessoal)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/exercises` | Cadastrar exercício |
| GET | `/exercises` | Listar exercícios (`?muscleGroup=Peito`) |
| GET | `/exercises/:id` | Buscar por ID |
| PATCH | `/exercises/:id` | Editar exercício |
| DELETE | `/exercises/:id` | Remover exercício |
| GET | `/exercises/:id/progression` | Progressão de carga ao longo do tempo |

### Workouts (sessões de treino)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/workouts` | Criar treino |
| GET | `/workouts` | Histórico de treinos |
| GET | `/workouts/:id` | Treino completo (exercícios + séries) |
| PATCH | `/workouts/:id` | Editar treino |
| POST | `/workouts/:id/finish` | Encerrar treino |
| DELETE | `/workouts/:id` | Deletar treino |
| POST | `/workouts/:id/exercises` | Adicionar exercício ao treino |
| DELETE | `/workouts/:id/exercises/:weId` | Remover exercício do treino |
| POST | `/workouts/:id/exercises/:weId/sets` | Registrar série (carga + reps) |
| GET | `/workouts/:id/exercises/:weId/sets` | Listar séries |
| PATCH | `/workouts/:id/exercises/:weId/sets/:setId` | Editar série |
| DELETE | `/workouts/:id/exercises/:weId/sets/:setId` | Deletar série |

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | Connection string PostgreSQL | — |
| `JWT_SECRET` | Segredo para assinar tokens | `change-me-in-production` |
| `PORT` | Porta da API | `3000` |

## Deploy com Docker

```bash
docker compose up --build
```
