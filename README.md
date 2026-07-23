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

2. Configure `.env.local` for **development**:

```env
ALFA_API_URL=https://localhost:7211
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-this-to-a-random-secret-at-least-32-chars
```

Use the same base URL as Swagger (`https://localhost:7211/swagger/index.html`) **without** the `/swagger` path.

3. Start the Alfa API locally:

```bash
dotnet run
```

4. Start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API URLs by environment

| Environment | Alfa API URL | How it is set |
|-------------|--------------|---------------|
| **Development** | `https://localhost:7211` | `.env.local` → `ALFA_API_URL` (default if unset) |
| **Production** | `https://apipharm.aghapy-company.com` | Hosting env → `ALFA_API_URL` (default if unset) |

The browser always calls `/api/alfa/*`; the Next.js server proxies to the correct Alfa API URL above.

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

Set these environment variables on your hosting platform:

```env
ALFA_API_URL=https://apipharm.aghapy-company.com
NEXTAUTH_URL=https://your-nextjs-domain.com
NEXTAUTH_SECRET=your-production-secret
```

If `ALFA_API_URL` is omitted in production, it defaults to `https://apipharm.aghapy-company.com`.

Swagger (production API docs): https://apipharm.aghapy-company.com/swagger/index.html

## Tech Stack

- Next.js 15 (App Router)
- NextAuth.js (JWT session, credentials via Alfa API)
- shadcn/ui + Tailwind CSS v4
- Alfa API RBAC
