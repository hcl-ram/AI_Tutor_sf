# Multi-stage Dockerfile for AI Tutor Application

# Stage 1: Build React Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY package*.json ./ 
COPY tailwind.config.js ./ 
COPY postcss.config.js ./ 

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build the React application
RUN npm run build

# Stage 2: Python Backend
FROM python:3.11-slim AS backend

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend from previous stage (copy the build folder)
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

# Install FastAPI and dependencies for serving static files
RUN pip install --no-cache-dir fastapi[all] python-multipart

# Create a simple static file server for the frontend
RUN echo 'from fastapi import FastAPI\n\
from fastapi.staticfiles import StaticFiles\n\
from fastapi.responses import FileResponse\n\
import os\n\
\n\
app = FastAPI()\n\
\n\
# Mount static files directory (React build)\n\
app.mount("/static", StaticFiles(directory="/app/frontend/build/static"), name="static")\n\
\n\
@app.get("/")\n\
async def read_index():\n\
    return FileResponse("/app/frontend/build/index.html")\n\
\n\
@app.get("/{path:path}")\n\
async def read_other(path: str):\n\
    # Serve index.html for all other routes (React Router)\n\
    if not os.path.exists(f"/app/frontend/build/{path}") or os.path.isdir(f"/app/frontend/build/{path}"):\n\
        return FileResponse("/app/frontend/build/index.html")\n\
    return FileResponse(f"/app/frontend/build/{path}")\n\
\n\
if __name__ == "__main__":\n\
    import uvicorn\n\
    uvicorn.run(app, host="0.0.0.0", port=3000)' > frontend_server.py

# Stage 3: Final Production Image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy Python dependencies from backend stage
COPY --from=backend /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend /usr/local/bin /usr/local/bin

# Copy application code from backend stage
COPY --from=backend /app/backend ./backend
COPY --from=backend /app/frontend_server.py ./ 

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose ports
EXPOSE 3000 8002

# Create startup script
RUN echo '#!/bin/bash\n\
# Start the frontend server in the background\n\
python frontend_server.py &\n\
\n\
# Start the backend API server\n\
cd backend && python api_routes.py' > start.sh && chmod +x start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

# Default command
CMD ["./start.sh"]
