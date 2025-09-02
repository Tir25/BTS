Alright — I’ll prepare a **full `project_overview.md`** for Cursor that includes:

* Project description & goals
* Tech stack & library choices (locked versions)
* Architecture & folder structure
* Development phases & workflow
* Coding standards & conventions
* Integration notes (Supabase, MapLibre, WebSockets, PostgreSQL/PostGIS)
* Deployment notes

Here’s your complete file:

---

```markdown
# 🚌 University Bus Tracking System — Project Overview

## 1. Project Description
A real-time bus tracking system for university students and faculty.  
- Allows students/faculty to track current bus location, route, and ETA.  
- Uses **driver mobile devices** for GPS tracking.  
- Supports **multiple cities & towns** for different campuses/routes.  
- Built for both **desktop and mobile**.

---

## 2. Core Goals
- **Accurate real-time GPS tracking** via WebSockets.  
- **Interactive map** with bus markers and routes.  
- **Secure authentication** (students, faculty, drivers, admin).  
- **Driver panel** for location sending.  
- **Admin dashboard** for managing buses, routes, and drivers.  
- **Minimal latency** and smooth user experience.

---

## 3. Tech Stack (Locked Versions)
### Frontend
- **React** (v18.x)  
- **TypeScript** (v5.x)  
- **Tailwind CSS** (v3.x)  
- **MapLibre GL** (`maplibre-gl@^3.3.0`)  
- **Socket.IO Client** (`socket.io-client@^4.7.5`)  

### Backend
- **Node.js** (LTS 20.x)  
- **Express** (v4.19.2)  
- **Socket.IO** (`socket.io@^4.7.5`)  
- **PostgreSQL** (v15+)  
- **PostGIS** (v3.3+) for geospatial queries  
- **Supabase JS** (`supabase-js@^2.39.0`) for authentication  

---

## 4. System Architecture
- **Backend API**: REST + WebSockets for GPS streaming.  
- **Database**: PostgreSQL + PostGIS for location data storage & route mapping.  
- **Auth**: Supabase Auth for login/signup/role management.  
- **Frontend**: React app with map & dashboard views.  
- **Driver Panel**: Mobile-friendly web page sending GPS updates.  

---

## 5. Folder Structure

```

/bus-tracking-system
│
├── backend
│   ├── src
│   │   ├── config        # Database, Supabase, env configs
│   │   ├── routes        # Express routes
│   │   ├── controllers   # Route handlers
│   │   ├── services      # GPS, bus logic
│   │   ├── models        # DB queries
│   │   ├── sockets       # WebSocket events
│   │   └── utils         # Helper functions
│   ├── tests
│   └── server.ts
│
├── frontend
│   ├── src
│   │   ├── components    # Reusable UI parts
│   │   ├── pages         # Page-level components
│   │   ├── hooks         # Custom React hooks
│   │   ├── context       # Global state
│   │   ├── services      # API calls
│   │   └── assets        # Images/icons
│   └── index.tsx
│
├── shared
│   └── types             # Shared TypeScript types
│
└── project\_overview\.md

````

---

## 6. Development Workflow (Phases)

**Phase 1 — Backend Base Setup**
- Express server with TypeScript.
- PostgreSQL + PostGIS connection.
- Supabase Auth integration.
- ENV config loading.

**Phase 2 — Real-time Location Backend**
- WebSocket setup with Socket.IO.
- Event: `driverLocationUpdate` for sending GPS coordinates.
- Store current location in-memory + periodically in DB.

**Phase 3 — Frontend Base Setup**
- React + TypeScript + Tailwind.
- Supabase Auth UI integration.
- MapLibre map rendering with OSM tiles.

**Phase 4 — Live Map Tracking**
- Connect WebSocket to map.
- Display bus markers in real-time.
- Show route lines from PostGIS data.

**Phase 5 — Driver Panel**
- Mobile UI for drivers.
- Access device GPS & send via WebSocket.
- Auth restricted to driver role.

**Phase 6 — Admin Panel**
- Manage buses, drivers, routes.
- View analytics (routes usage, delays).
- Secure via role-based access.

**Phase 7 — Deployment**
- Backend: Railway/Render (Node.js + Postgres + PostGIS).  
- Frontend: Netlify/Vercel.  
- ENV setup for production.

---

## 7. Coding Standards
- Always use **async/await**, avoid `.then()`.
- No `any` in TypeScript — define proper types.
- Functions < 40 lines; break down logic.
- Variables: `camelCase` for JS/TS, `UPPER_CASE` for constants.
- Commit messages: `feat:`, `fix:`, `refactor:`, `chore:`.
- Avoid hardcoding values — use ENV variables.

---

## 8. Integration Notes
- **Supabase Auth**:
  - Roles: `student`, `faculty`, `driver`, `admin`.
  - Protect routes using middleware.
- **MapLibre**:
  - Use OSM tiles by default.
  - Markers updated via WebSocket events.
- **WebSockets**:
  - Room per route (so only relevant updates are sent).
  - Event format:
    ```json
    {
      "busId": "B101",
      "lat": 23.025,
      "lng": 72.571,
      "timestamp": "2025-08-09T12:30:00Z"
    }
    ```
- **Database**:
  - `buses`, `drivers`, `routes`, `locations` tables.
  - PostGIS for distance/ETA calculations.

---

## 9. Deployment Notes
- Use **PostgreSQL with PostGIS** installed.
- Use `dotenv` for local development ENV.
- Enable CORS for frontend domain only.
- Consider enabling HTTPS for GPS accuracy.

---

## 10. Cursor Usage Guidelines
- Always reference `project_overview.md` before coding.
- Do not introduce new libraries without approval.
- Work **phase by phase** — no skipping ahead.
- Keep architecture & folder structure unchanged.
- Code in TypeScript for both backend & frontend.
- Maintain minimal & readable code with clear comments.