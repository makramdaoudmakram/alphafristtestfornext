# Alfa Next.js Frontend

Next.js calls your Alfa API through a proxy (`/api/alfa/*` → `ALFA_API_URL`). Login uses `POST /api/Auth/login` on **your** Alfa project with database `aghapany_AlphaAPI`.

## Prerequisites

- Node.js 18+
- Alfa API running (see `Alfa` project)
- API connection string: `Data Source=192.185.7.239;Initial Catalog=aghapany_AlphaAPI;...`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure `.env.local` — set **your** Alfa API URL:

```env
# Use the same URL where Swagger opens (no /swagger)
ALFA_API_URL=http://localhost:5258
```

If you run from **Visual Studio (IIS Express)**, use:
```env
ALFA_API_URL=http://localhost:21137
```

3. Start the Alfa API (uses database `aghapany_AlphaAPI`):

```bash
dotnet run
```

4. Start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth & RBAC

| Action | Alfa API endpoint | Database |
|--------|-------------------|----------|
| Register | `POST /api/Auth/register` | `AspNetUsers` in `aghapany_AlphaAPI` |
| Login | `POST /api/Auth/login` | same |
| My permissions | `GET /api/Permissions/me` | `AppRoles`, `AppPermissions`, etc. |
| Manage roles | `GET/PUT /api/Permissions/roles/{id}` | same |

- First registered user gets **Admin** AppRole.
- Later users get **Viewer**.
- Permissions page requires `Permissions.Manage`.

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Sign in via Alfa API |
| `/register` | Create account via Alfa API |
| `/dashboard` | Your roles & permissions |
| `/dashboard/permissions` | Role permission checkboxes (Admin) |
| `/dashboard/customers` | Demo page (`Customer.View`) |
| `/dashboard/item-formats` | Demo page (`ItemFormat.View`) |

## Production

Set `NEXT_PUBLIC_API_URL` to your deployed Alfa API URL (e.g. `https://api.yourdomain.com`).

Ensure the Alfa API CORS policy allows your Next.js origin (`http://localhost:3000` in development).

## Tech Stack

- Next.js 15 (App Router)
- NextAuth.js (JWT session, credentials via Alfa API)
- shadcn/ui + Tailwind CSS v4
- Alfa API RBAC
