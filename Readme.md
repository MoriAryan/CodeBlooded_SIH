# eRTMAC-NWIS — Nearby Wells Intelligence System

An AI-powered decision support platform for drilling operations, built for **Oil India Limited**. NWIS gives drilling engineers instant access to offset well intelligence — historical events, geospatial context, and formation-level risk insights — all in one unified dashboard.

> Built as a finalist project for **Smart India Hackathon 2024** (Problem Statement #26121, Theme: Smart Automation).

---

## What It Does

Drilling teams today spend hours digging through scattered PDFs, completion reports, and personal notes before making critical decisions. NWIS fixes that.

- 📍 **Interactive GIS Map** — Visualize active and offset wells on a Leaflet-powered map. Define a search radius and instantly see nearby wells relative to the active well.
- 📊 **Corridor Dashboard** — A unified control panel showing real-time well status, active event counts, and key operational metrics at a glance.
- 🔎 **Offset Well Intelligence** — Browse detailed drilling histories of nearby wells — events like mud losses, kicks, stuck pipe, and casing programs — searchable and filterable by depth and formation.
- 🔗 **Cross-Well Correlation** — Compare drilling parameters, reservoir characteristics, and operational events across multiple wells side by side.
- ⚠️ **Proactive Alerts** — Get notified when the active well approaches depths or formations where similar challenges were encountered in offset wells.
- 🗂️ **Subsurface GIS View** — A dedicated workspace for geospatial analysis of well trajectories and formation data.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Leaflet |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | PostgreSQL 16 + PostGIS 3.5 (Dockerized) |
| AI/ML Service | Python (FastAPI) |
| Shared Types | TypeScript (monorepo shared package) |
| Data Ingestion | Python scripts (Volve dataset) |

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **Docker** (for PostgreSQL/PostGIS)
- **Python** 3.10+ (for the ML service)

### 1. Clone and configure

```bash
git clone https://github.com/<your-username>/eRTMAC-NWIS.git
cd eRTMAC-NWIS
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local development.

### 2. Start the database

```bash
docker compose up -d
```

This spins up a PostGIS-enabled PostgreSQL instance on port `5433`.

### 3. Set up the backend

```bash
cd backend
npm install
npm run setup    # runs migrations + seeds the database
npm run dev      # starts the dev server on port 3001
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev      # starts Vite dev server on port 5173
```

### 5. (Optional) Start the Python ML service

```bash
cd python-service
pip install -r requirements.txt
python main.py   # starts on port 5001
```

Once everything is running, open **http://localhost:5173** in your browser.

---

## Project Structure

```
├── frontend/          React + Vite dashboard application
├── backend/           Express API server with Socket.IO
├── python-service/    FastAPI-based ML/analytics microservice
├── shared/            Shared TypeScript type definitions
├── tools/             Data download and ingestion scripts
├── docker-compose.yml PostGIS database container config
└── .env.example       Environment variable template
```

---

## Architecture Overview

```
┌─────────────┐     WebSocket / REST      ┌──────────────┐
│   Frontend   │◄────────────────────────►│   Backend    │
│  (React/Vite)│                          │  (Express)   │
└─────────────┘                          └──────┬───────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │                       │
                              ┌─────▼─────┐         ┌──────▼──────┐
                              │  PostGIS   │         │   Python    │
                              │  Database  │         │  ML Service │
                              └───────────┘         └─────────────┘
```

The frontend communicates with the backend via REST APIs and WebSocket connections for real-time updates. The backend queries PostGIS for geospatial data and delegates ML tasks to the Python microservice.

---

## Data

This project uses the publicly available **Volve field dataset** (released by Equinor) for development and demonstration. The `tools/` directory contains scripts to download and ingest this data into the PostGIS database.

The `data/` directory is gitignored — you'll need to run the ingestion scripts locally after cloning.

---

## Smart India Hackathon 2024

**Problem Statement:** eRTMAC-NWIS — An AI-Powered Offset Well Knowledge and Decision Support Platform for Drilling Operations

**PS ID:** 26121 | **Organization:** Oil India Limited | **Category:** Software | **Theme:** Smart Automation

### Team Code Blooded

| Name | Role | Institute |
|------|------|-----------|
| Drashti Singh | Team Leader | SVNIT, Surat |
| Aarushi Gawas | Member | SVNIT, Surat |
| Yash Gondaliya | Member | SVNIT, Surat |
| Khushboo Chaudhary | Member | SVNIT, Surat |
| Mori Aryan | Member | SVNIT, Surat |
| Aryan | Member | SVNIT, Surat |

**Team ID:** 145437 | **College:** Sardar Vallabhbhai National Institute of Technology, Surat

---

## License

This project was developed as part of the Smart India Hackathon and is intended for educational and demonstration purposes.
