# Mongo Manager

A modern, web-based MongoDB management tool built with Vue 3 and Node.js. A lightweight alternative to MongoDB Compass that runs entirely in your browser.

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
- API: http://localhost:3000/api

### Docker

```bash
docker-compose up -d
```

### Default Login

- Username: `admin`
- Password: `admin`

## Project Structure

```
mongomanager/
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

## Author

**Gokhan Ozgezer**
Email: gokhanozgezer@gmail.com

## License

MIT
