# notes-api

Small Express + PostgreSQL REST API. Base app for the Docker, CI/CD and Kubernetes tasks.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Checks the database connection |
| GET | /notes | List notes |
| GET | /notes/:id | Get one note |
| POST | /notes | Create (`{"title": "...", "content": "..."}`) |
| PUT | /notes/:id | Update |
| DELETE | /notes/:id | Delete |

## Run locally (needs Node 20+ and a running Postgres)

    cp .env.example .env     # then edit values to match your Postgres
    npm install
    npm run dev

## Run with Docker

    copy .env.example .env     (set DB_PASSWORD to something other than change-me)
    docker compose up -d --build
    curl.exe http://localhost:3000/health

## Run with Docker

    copy .env.example .env     (set DB_PASSWORD to something other than change-me)
    docker compose up -d --build
    curl.exe http://localhost:3000/health
