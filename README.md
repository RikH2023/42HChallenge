# Netherlands Flood Report Prototype

This project has two applications that run in separate terminals:

- `Backend/`: FastAPI service for reports, city alerts, and geocoding.
- `Frontend/`: Vite and vanilla JavaScript interface with map, public report, and admin pages.

## Prerequisites

Install the following before starting:

- Python 3.10 or later
- Node.js 18 or later (includes npm)

## Run the backend

Open a PowerShell terminal from the repository root and run:

```powershell
cd Backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m uvicorn main:app --reload
```

The API is available at [http://127.0.0.1:8000](http://127.0.0.1:8000). Its interactive API documentation is at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

On later runs, activate the existing environment, then start Uvicorn:

```powershell
cd Backend
.\.venv\Scripts\Activate.ps1
py -m uvicorn main:app --reload
```

## Run the frontend

Keep the backend terminal running. In a second PowerShell terminal from the repository root, run:

```powershell
cd Frontend
npm install
npm run dev
```

Vite prints the local URL, normally [http://localhost:5173](http://localhost:5173). Open one of these pages:

| Page | URL |
| --- | --- |
| Flood map | [http://localhost:5173/](http://localhost:5173/) |
| Admin dashboard | [http://localhost:5173/admin.html](http://localhost:5173/admin.html) |
| Public reporting page | [http://localhost:5173/public/](http://localhost:5173/public/) |

The frontend's default Vite port, `5173`, is already allowed by the backend CORS configuration.

## Current API connection

The public report and admin pages call the backend at `http://127.0.0.1:8000` for reports, messages, and city data. The map reads its points from `GET /reports`, so each submitted and successfully geocoded report appears at its backend-provided location with its calculated severity. Set `VITE_API_URL` to use a different API base URL when deploying.

The map, public announcements, and admin dashboard refresh automatically every 30 seconds while their browser tab is visible. They also refresh immediately when the user returns to the tab.

## Verify a production frontend build

To check that the frontend compiles:

```powershell
cd Frontend
npm run build
```

Stop either development server with `Ctrl+C` in its terminal.
