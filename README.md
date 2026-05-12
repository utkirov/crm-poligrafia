# CRM Poligraf

Local CRM for a print shop built with `React`, `TypeScript`, and `Vite`.

The app runs fully in the browser. Data, users, and the current session are stored in `localStorage`.
The local mode is the primary runtime of the project.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo Login

- Login: `director`
- Password: `123456`
- Login: `financier`
- Password: `123456`
- Login: `manager1`
- Password: `123456`
- Login: `designer1`
- Password: `123456`

## Local Storage Keys

- `crm-poligraf.local-db.v1`
- `crm-poligraf.local-session.v1`

Delete these keys in the browser to reset demo data.

You can also manage local data from `/settings/local-data`:

- export current local database to JSON
- import a previously exported JSON snapshot
- reset demo data

## Main Files

- Data layer: [src/lib/localDb.ts](/D:/utkirov/work/2026/AI/new-crm-polig/src/lib/localDb.ts)
- Auth store: [src/store/authStore.ts](/D:/utkirov/work/2026/AI/new-crm-polig/src/store/authStore.ts)
- User management: [src/components/UserFormModal.tsx](/D:/utkirov/work/2026/AI/new-crm-polig/src/components/UserFormModal.tsx), [src/pages/UsersPage.tsx](/D:/utkirov/work/2026/AI/new-crm-polig/src/pages/UsersPage.tsx)

## Checks

```bash
npm run lint
npm run build
```

## Main Roles

- `director`: full access to orders, clients, services, analytics, users, cancel reasons, and local data tools
- `manager`: access to own orders, order creation, clients, and services
- `financier`: access to finance and payment management
- `designer`: employee role for monthly KPI planning and assigned production tickets

## KPI

- KPI is available only to `director`
- KPI is supported for `manager` and `designer`
- KPI records are stored by month on `/users/:id/kpi`
- the current stage stores only plan values

## Order Tickets

- each order can have one production ticket
- a ticket is created from the order card
- a ticket has one shared status: `new -> in_progress -> done`
- a ticket always has two assignees: `manager` and `designer`
- `director` and `manager` can create and edit tickets
- `designer` can open assigned tickets and update the shared status
- ticket routes:
  - `/tickets`
  - `/tickets/:id`
