# School ERP — Frontend (web app)

React 18 + Vite web app for the eight school portals. The API lives in its own repository (`school-erp-backend`); this app only talks to it over HTTP.

```
browser → this frontend (:5173) → /api → backend (:4000) → MongoDB Atlas
```

| Portal | Sign-in URL | Who |
|---|---|---|
| Student | `/student/login` | Learner: timetable, attendance heat map, homework, results & class ranks, fees (read-only), library |
| Teacher | `/teacher/login` | Staff: classes, attendance (class teacher only), homework, exams & marks, performance, leave, **salary & payslips** |
| Finance | `/finance/login` | Fee structures, payments, receipts, dues, reports |
| Library | `/library/login` | Catalogue, issue/return, overdue, fines |
| Transport | `/transport/login` | Transport officer: buses, drivers, conductors, maintainers, routes, riders, own designations |
| Staff | `/staff/login` | Non-teaching staff and transport crew: check-in/out, attendance, leave, payslips |
| School Admin | `/admin/login` | One per school: everything academic, staff, **payroll & salaries**, promotion, import, settings |
| Platform Admin | `/platform/login` | Schools, subscriptions, School Admins |

`/` is a landing page with a card per role.

## Run it
```bash
npm install
npm run dev        # http://localhost:5173  (needs the backend running on :4000)
```
In development Vite proxies `/api` to `http://localhost:4000` (change with `VITE_PROXY_TARGET`).
For a separately hosted API, build with `VITE_API_URL=https://api.your-domain.com npm run build` and serve `dist/` from any static host; allow that origin in the backend's `CORS_ORIGIN`.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm run preview` | Production build in `dist/` / preview it |
| `npm test` / `npm run lint` | 33 unit & component tests / ESLint |
| `npm run e2e` | 21 real-browser tests (Playwright). Needs the backend repo checked out next to this one at `../backend` (or set `BACKEND_DIR`); it starts its own throw-away demo database, never Atlas |

First time for the browser tests: `npm --prefix e2e install` (it uses the Chromium Playwright already downloaded, or `npx playwright install chromium`).

## Layout
```
src/pages/{platform,admin,teacher,student,finance,library,shared}   one folder per portal
src/components  src/api  src/hooks  src/auth                        shared UI, API client, lookups, auth
e2e/                                                                 Playwright browser tests
```
