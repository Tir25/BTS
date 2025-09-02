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

## **7. Cursor Instructions**

When working in Cursor:

1. **Follow the development workflow exactly** – don’t skip phases.
2. **Never mix unrelated features in the same commit**.
3. **Before coding**, restate the current phase and goal in context.
4. Always ensure code works locally before moving to the next phase.
5. Use environment variables for all credentials.
6. Keep frontend & backend changes **synchronized** – test integration often.
7. Avoid adding new libraries unless absolutely necessary.
8. Stick to chosen tech stack unless explicitly updated.
