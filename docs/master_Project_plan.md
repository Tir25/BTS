Cursor Instructions

When working in Cursor:

1. **Follow the development workflow exactly** – don’t skip phases.
2. **Never mix unrelated features in the same commit**.
3. **Before coding**, restate the current phase and goal in context.
4. Always ensure code works locally before moving to the next phase.
5. Use environment variables for all credentials.
6. Keep frontend & backend changes **synchronized** – test integration often.
7. Avoid adding new libraries unless absolutely necessary.
8. Stick to chosen tech stack unless explicitly updated.
9.Read the Further to get more understanding about the project and is' development 

Here’s the organized file:

---

# 🚍 University Bus Tracking System — Master Project Plan

## **1. Project Overview**

A **web-based** real-time bus tracking system for a university, allowing students and faculty to see current bus locations, ETAs, and routes.

* **Platform (Phase 1):** Web app only (mobile-friendly)
* **Platform (Phase 2):** Optional Android app after stable launch
* **Tracking Method:** GPS from driver’s mobile phone
* **Map Provider:** OpenStreetMap
* **Map Library:** MapLibre GL JS
* **Database:** PostgreSQL with PostGIS
* **File Storage:** Supabase Storage (free tier)
* **Authentication:** Supabase Auth (email/password)
* **Real-Time Updates:** WebSocket streaming
* **ETA Calculation:** PostGIS route-based calculation
* **Admin Panel:** Built into main React frontend
* **Hosting:** Decide later (local/dev hosting for now)

---

## **2. Final Tech Stack**

**Frontend**

* React (with Vite)
* TypeScript
* Tailwind CSS (UI styling)
* MapLibre GL JS (maps)

**Backend**

* Node.js + Express.js
* WebSockets for real-time updates
* Supabase Auth integration (via API)
* PostgreSQL + PostGIS for spatial data and calculations

**Storage**

* Supabase Storage (driver profile pics, bus images, etc.)

**Tools & Utilities**

* Cursor AI for code generation and guidance
* ESLint + Prettier for code quality
* Git + GitHub for version control

---

## **3. Development Workflow (Step-by-Step)**

### **Phase 1 – Project Setup**

1. **GitHub Repository** (init repo, push to GitHub)
2. **Frontend + Backend Folder Structure** (monorepo or separate repos)
3. **Environment Config** (setup `.env` files for API keys, DB URL)
4. Install **all dependencies** for both frontend & backend

---

### **Phase 2 – Backend Core**

1. **PostgreSQL + PostGIS setup**

   * Create tables: buses, drivers, routes, locations, users (admins, students)
   * Enable PostGIS extensions for spatial queries
2. **Supabase Auth** setup in backend

   * Routes for signup/login/logout for drivers & admins
3. **WebSocket server** setup for location streaming
4. **Basic REST API** for:

   * Fetching all buses and routes
   * Updating bus location (driver-side)
5. **Test APIs with Postman**

---

### **Phase 3 – Frontend Core**

1. **React setup with Tailwind CSS**
2. **MapLibre integration** with OSM tiles
3. **Auth pages** (login for driver/admin)
4. **Basic map view** showing bus markers from backend
5. **WebSocket integration** for live updates
6. **ETA display** using PostGIS-calculated data from backend

---

### **Phase 4 – Admin Panel**

1. **Bus & driver management** (CRUD)
2. **Route management** (CRUD with map-based drawing)
3. **Live monitoring dashboard** for all buses
4. **Upload images/files** (integrate Supabase Storage)

---

### **Phase 5 – Driver Interface**

1. **Driver login** (Supabase Auth)
2. **Start trip / end trip buttons**
3. **Automatic GPS location sending** via WebSocket

---

### **Phase 6 – Testing & Optimization**

1. Test **real-time accuracy** and WebSocket stability
2. Optimize **PostGIS queries** for ETA speed
3. Test across multiple browsers & devices
4. Fix bugs & polish UI

---

### **Phase 7 – Optional Hosting**

* Decide between: Railway, Render, Supabase (backend), Vercel/Netlify (frontend)
* Set up production database & environment variables
* Configure CORS and SSL

---

## **4. Best Practices & Notes**

* Keep **frontend & backend modular** so future mobile app can reuse backend APIs
* Use **consistent naming** for DB tables, API routes, and frontend components
* Always **validate inputs** in backend (especially GPS data)
* Keep **WebSocket messages lightweight** (only send essential data)
* Cache map tiles locally for better performance
* Commit changes frequently with clear messages
* Avoid overcomplicating Phase 1 — build a **minimum working version first**, then expand
* Keep all project-related files organized in `/docs` for easy reference

---

## **5. Common Mistakes to Avoid**

* Mixing **auth logic** between frontend & backend — keep auth verification on backend
* Over-fetching map data — fetch only what’s visible on the screen
* Forgetting to handle **WebSocket disconnections**
* Ignoring **mobile responsiveness** from the start
* Not documenting API routes — always keep an up-to-date API doc


Alright — I’ll combine **everything from our bus tracking system discussion** into one **structured, detailed, and Cursor-friendly file**.
This will serve as a **single source of truth** so Cursor always stays aligned with your decisions, development plan, and guidelines.

---

## **Bus Tracking System – Master Development File for Cursor**

### **1. Project Overview**

You are building a **University Bus Tracking System** as a **web application** (mobile version later).
The system will allow **students & faculty** to view real-time locations, ETAs, and routes of university buses across multiple towns/cities.
Bus drivers will use **their own smartphones as GPS devices** to update location.
Map visualization will use **OpenStreetMap** with **MapLibre**.

---

## **2. Final Tech Stack**

### **Frontend**

* **Framework**: React (with TypeScript)
* **Map Library**: MapLibre GL JS (works with OpenStreetMap)
* **UI Framework**: Tailwind CSS
* **State Management**: Zustand or Redux Toolkit
* **Real-time Updates**: WebSocket streaming

### **Backend**

* **Runtime**: Node.js
* **Framework**: Express.js
* **Database**: PostgreSQL with PostGIS extension (for geospatial queries & ETA calculation)
* **Auth**: Supabase Auth (email/password for drivers and admin)
* **Real-time Communication**: WebSocket (Socket.IO or native ws)
* **File/Image Storage**: Supabase Storage
* **Geospatial Processing**: PostGIS functions

### **Maps & Location**

* **Base Map**: OpenStreetMap tiles
* **Rendering**: MapLibre
* **Geolocation Source**: Driver's phone GPS via browser/mobile web app
* **Routing**: PostGIS route-based calculations

---

## **3. Final Feature Decisions**

* **Auth System** → Supabase Auth (easy integration, secure, role-based)
* **Real-Time Strategy** → WebSocket streaming (smooth, instant updates, low latency)
* **ETA Calculation Method** → PostGIS route-based calculation (more accurate)
* **Admin Panel** → Built into same React frontend as user app (with role-based access)
* **Map Library** → MapLibre (OSM compatible, free, high performance)
* **Storage** → Supabase Storage (free tier, directly connected to backend)

---

## **4. Best Practices & Pitfalls to Avoid**

### **General**

* Keep environment variables separate for dev & prod.
* Never hardcode API keys or secrets.
* Test each integration in isolation before combining.

### **Backend**

* Structure routes with clear separation: `/auth`, `/buses`, `/admin`, `/tracking`.
* Use **DTOs** (Data Transfer Objects) for data validation (e.g., Zod or Joi).
* Keep WebSocket and REST API logic separate for maintainability.
* Always sanitize user input before database queries.
* Implement role-based access: `student`, `driver`, `admin`.
* Store coordinates as `GEOGRAPHY(Point, 4326)` for PostGIS.

### **Frontend**

* Centralize state for bus data to avoid multiple API calls.
* Use WebSocket only for live tracking data; fetch static info via REST.
* Optimize MapLibre rendering by using markers efficiently.
* Use loading & error states for every async operation.

### **Real-Time (WebSocket)**

* Only send minimal data (bus\_id, lat, lng, speed, timestamp).
* Throttle driver GPS updates to every 2–3 seconds to reduce load.
* Handle reconnection gracefully.

### **Supabase**

* Use RLS (Row-Level Security) for data isolation per role.
* Store files in structured folders (e.g., `/drivers/photos/`, `/bus/documents/`).
* Monitor free tier limits to avoid sudden service block.

### **PostGIS**

* Precompute common routes to avoid runtime heavy calculations.
* Use `ST_DistanceSphere` for distance & `ST_LineInterpolatePoint` for ETAs.
* Index location columns with GIST for speed.

---

## **5. Development Workflow (Order of Work)**

**Phase 1 – Project Setup**

* Initialize Git repo & project structure.
* Setup PostgreSQL with PostGIS locally.
* Setup Supabase project (Auth + Storage).
* Create `.env` with placeholder variables.

**Phase 2 – Backend Foundations**

* Install Node.js, Express, Postgres client, WebSocket library.
* Create base routes (`/auth`, `/buses`, `/tracking`).
* Implement Supabase Auth integration in backend.
* Test database connection & PostGIS queries.

**Phase 3 – Frontend Foundations**

* Create React project with TypeScript.
* Setup TailwindCSS & MapLibre integration.
* Create basic pages: `Login`, `Dashboard`, `Bus Map`.
* Integrate Supabase Auth on frontend.

**Phase 4 – Real-Time Tracking**

* Implement WebSocket server for live location.
* Create driver location update endpoint.
* Display live bus positions on MapLibre in frontend.

**Phase 5 – ETA Calculation**

* Implement PostGIS route-based ETA API.
* Show ETA for each bus on frontend.

**Phase 6 – Admin Panel**

* Add role-based access control.
* Create admin features: Add/Edit buses, manage drivers, view all routes.
* Upload bus/driver documents via Supabase Storage.

**Phase 7 – Testing & Optimization**

* Test real-time tracking under slow networks.
* Optimize database queries with indexes.
* Fix UI performance issues with large number of markers.

**Phase 8 – Final Polish**

* Add error handling & loading states everywhere.
* Prepare deployment scripts.
* Document environment variable setup.

---

## **6. Project Structure (Recommended)**

```
bus-tracking-system/
│
├── backend/
│   ├── src/
│   │   ├── config/        # DB, Supabase, env configs
│   │   ├── controllers/   # Route handlers
│   │   ├── models/        # DB models & queries
│   │   ├── routes/        # Express routes
│   │   ├── services/      # Business logic
│   │   ├── sockets/       # WebSocket logic
│   │   └── utils/         # Helper functions
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI parts
│   │   ├── pages/         # Login, Dashboard, Admin
│   │   ├── hooks/         # Custom hooks
│   │   ├── store/         # Zustand/Redux state
│   │   ├── services/      # API calls
│   │   └── styles/        # Tailwind configs
│   ├── package.json
│   └── .env
│
├── docs/                  # Project documentation
├── .gitignore
└── README.md
```

---

 
