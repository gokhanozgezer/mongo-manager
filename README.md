# Mongo Manager

A modern, web-based MongoDB management tool built with Vue 3 and Node.js. A lightweight alternative to MongoDB Compass that runs entirely in your browser.

<img width="416" height="295" alt="Mongo-Manager" src="https://github.com/user-attachments/assets/7cdc3fea-09bd-499c-a4d8-6638bc9e835f" />

<img width="416" height="295" alt="Mongo-Manager_1" src="https://github.com/user-attachments/assets/3708d37d-a383-477f-a800-a4e04bb96c52" />

<img width="593" height="288" alt="Mongo-Manager_2" src="https://github.com/user-attachments/assets/c3e52462-41a3-4769-a6e0-47d9566d20ac" />

## Features

### Connection Management
- Multiple MongoDB server connections
- Auto-connect on startup
- Connection favorites

### Database Operations
- Create, view, and drop databases
- Database statistics

### Collection Management
- Create, drop, and rename collections
- Collection statistics and indexes
- Index creation and management

### Document Operations
- Full CRUD operations
- JSON filter and sort
- Pagination
- Bulk delete
- Document import/export

### Aggregation Pipeline
- Visual pipeline editor
- Save and load pipelines
- Explain output
- Paginated results

### User Interface
- Dark/Light theme
- Classic/Modern UI themes
- Multi-language support (EN/TR)
- Customizable fonts
- Responsive design

### Security
- User authentication
- Session-based access control
- Profile management

## Requirements

- Node.js 18+
- MongoDB 4.4+

## Installation

### Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Access:
- Frontend: http://localhost:5173
- API: http://localhost:3001/api

### Docker

```bash
docker-compose up -d
```

Access:
- Frontend: http://localhost:5173
- API: http://localhost:3001/api

#### Changing Ports (Port Conflicts)

If ports `5173` or `3001` are already in use on your system, you can modify them in `docker-compose.yml`:

```yaml
# Default: "5173:80" - Change 5173 to any available port (e.g., 8080)
frontend:
  ports:
    - "8080:80"  # Now accessible at http://localhost:8080

# Default: "3001:3001" - Change first port to any available (e.g., 3002)
backend:
  ports:
    - "3002:3001"
  environment:
    - CORS_ORIGIN=http://localhost:8080  # Must match frontend port
```

After changing ports, rebuild the containers:
```bash
docker-compose down
docker-compose up -d --build
```

### Production (Without Docker)

For those who prefer not to use Docker, you can run the application using PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Install dependencies and build frontend
cd backend && npm install && cd ..
cd frontend && npm install && npm run build && cd ..

# Start all services
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Auto-start on system boot
```

Access:
- Frontend: http://localhost:5173
- API: http://localhost:3001/api

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend API port |
| `SERVER_IP` | `0.0.0.0` | IP address to bind. Use specific IP for multi-IP servers |
| `NODE_ENV` | `development` | Environment mode (`development` / `production`) |

Example for binding to a specific IP:
```javascript
// ecosystem.config.cjs
env: {
  PORT: 3001,
  SERVER_IP: '192.168.1.100'  // Bind to specific network interface
}
```

#### Useful PM2 Commands
```bash
pm2 list              # List all processes
pm2 logs              # View logs
pm2 restart all       # Restart all processes
pm2 stop all          # Stop all processes
pm2 delete all        # Remove all processes
```

### Production with Nginx

For production deployment with a custom domain:

#### 1. Backend Setup (PM2)
```bash
cd backend && npm install
pm2 start server.js --name "mongo-manager-api"
pm2 save
pm2 startup
```

#### 2. Frontend Build
```bash
cd frontend && npm install
npm run build
# Copy dist folder to nginx web root
sudo cp -r dist /var/www/mongo-manager
```

#### 3. Nginx Configuration

Create `/etc/nginx/sites-available/mongo-manager`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # Change to your domain

    # Frontend
    root /var/www/mongo-manager;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/mongo-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. SSL with Certbot (Optional)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Default Login

- Username: `admin`
- Password: `admin`

## Project Structure

```
mongo-manager-main/
├── backend/
│   ├── src/
│   │   ├── config/         # Auth & configuration
│   │   ├── controllers/    # API handlers
│   │   ├── routes/         # Route definitions
│   │   └── services/       # MongoDB client
│   ├── data/               # User data storage
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # Vue components
│   │   ├── stores/         # Pinia stores
│   │   ├── views/          # Page views
│   │   └── locales/        # i18n translations
│   └── vite.config.js
└── docker-compose.yml
```

## Tech Stack

**Backend:**
- Node.js
- Express
- MongoDB Driver

**Frontend:**
- Vue 3
- Pinia
- Vue Router
- Vue I18n
- CodeMirror 6
- Vite

## Contributing

Contributions are welcome! Please follow these guidelines:

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test` (in both `backend/` and `frontend/`)
5. Run linter: `npm run lint`
6. Commit your changes
7. Push to your fork
8. Open a Pull Request

### CI/CD Pipeline

This project uses GitHub Actions for continuous integration. All pull requests must pass:

- **Backend Tests**: Linting and unit tests
- **Frontend Tests**: Linting, unit tests, and build verification
- **Docker Build**: Ensures the Docker image builds successfully

### Branch Protection

The `main` branch is protected. Pull requests require:
- All CI checks to pass
- At least one approval (for external contributors)

### Running Tests Locally

```bash
# Backend
cd backend
npm install
npm run lint
npm test

# Frontend
cd frontend
npm install
npm run lint
npm test
npm run build
```

## Author

**Gokhan Ozgezer**
Email: gokhanozgezer@gmail.com

## License

MIT
