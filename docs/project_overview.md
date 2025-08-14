To make Cursor work better for your bus tracking system project, you can set it up so it always “remembers” your tech stack, architecture, and coding style, and doesn’t derail into unnecessary changes mid-development.

Here’s what you can do:

---

## **1. Give Cursor a Permanent Project Context**

* In Cursor, create a **`project_overview.md`** file in the root folder containing:

  * Tech stack (with versions if possible)
  * All decisions we finalized
  * Development workflow order
  * Best practices you want followed
  * Folder structure
  * Naming conventions (functions, files, variables)
  * Any UI/UX style rules
* Whenever you ask Cursor something, reference this file:

  > “Follow `project_overview.md` and don’t deviate from it unless I approve.”

---

## **2. Keep One Master File for Instructions**

* Alongside `project_overview.md`, create **`dev_instructions.md`**:

  * Rules for coding style (e.g., use async/await, avoid `any` in TypeScript)
  * Integration guidelines (how Supabase Auth is handled, how MapLibre loads, how WebSockets are implemented)
  * Deployment instructions (even if not deploying now, outline the possible method)
* If you later change something, **update this file immediately** so Cursor doesn’t use outdated logic.

---

## **3. Lock in Your Dependencies Early**

* Add a **`package.json`** early with all libraries (even if you don’t install all at once).
  Example:

  ```json
  "dependencies": {
    "express": "^4.19.2",
    "socket.io": "^4.7.5",
    "pg": "^8.11.1",
    "postgis": ">=3.3.0",
    "maplibre-gl": "^3.3.0",
    "supabase-js": "^2.39.0"
  }
  ```
* Cursor will then automatically autocomplete and generate code based on the correct libraries.

---

## **4. Break Development into Cursor-Friendly Phases**

Instead of dumping the whole project at once, guide Cursor through **one clearly defined phase at a time**:

1. **Backend base** → Express + PostgreSQL connection + PostGIS setup
2. **Auth** → Supabase Auth integration
3. **Real-time GPS backend** → WebSocket events
4. **Frontend map** → React + MapLibre integration
5. **Driver panel** → GPS sending from mobile browser
6. **Admin panel** → React components + data views

Always tell Cursor:

> “Work only on Phase X. Don’t add features from later phases.”

---

## **5. Keep Code Generation Focused**

When prompting Cursor:

* **Be specific**: “Add a WebSocket event in `gpsService.js` to emit driver location updates.”
* **Avoid vague asks**: “Make the GPS feature” (too broad, Cursor might guess wrong).
* Reference files: “Update `src/components/MapView.tsx` to display live bus markers.”

---

## **6. Use Guardrails in Prompts**

Whenever asking Cursor something, remind it:

> “Follow project\_overview\.md, keep existing architecture intact, and do not introduce new libraries unless I approve.”

---

## **7. Save and Reuse Prompts**

Cursor lets you **pin prompts** in your project:

* Pin “Generate backend API routes” template
* Pin “Create a React component following Tailwind style” template
* Pin “Integrate MapLibre map with OSM tiles” template
  This way, you always generate consistent code.

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
- Always reference `project_overview.md and Master Project Plan ` before coding.
- Do not introduce new libraries without approval.
- Work **phase by phase** — no skipping ahead.
- Keep architecture & folder structure unchanged.
- Code in TypeScript for both backend & frontend.
- Maintain minimal & readable code with clear comments.


