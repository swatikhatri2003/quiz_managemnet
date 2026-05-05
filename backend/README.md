# Backend (Node.js + MVC)

## Setup

1. Create `.env` from `.env.example`
2. Install deps:

```bash
npm i
```

3. Run dev server:

```bash
npm run dev
```

## API

Base URL: `/api`

- `POST /api/teams/get` body: `{ team_id? , quiz_id? }`
- `POST /api/rounds/get` body: `{ round_id? , quiz_id? }`
- `POST /api/points/upsert` body: `{ point_id? , points, team_id, round_id }`
- `POST /api/points/get` body: `{ team_id? , round_id? , quiz_id? }`
- `POST /api/quiz/get` body: `{ quiz_id? }`  
  If `quiz_id` provided, returns quiz + teams + rounds + points.

Uploads are served from `/uploads/*`.

