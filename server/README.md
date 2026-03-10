# Node.js Express Backend with TypeScript & MongoDB

This is a production-ready backend project with Authentication (JWT) and Notes CRUD operations.

## Features

- **Authentication**: Register and Login with JWT and password hashing.
- **Notes**: Create, Read, Update, Delete notes (User scoped).
- **Security**: Helmet, CORS, Rate Limiting.
- **Database**: MongoDB with Mongoose.
- **Language**: TypeScript.

## Prerequisites

- Node.js (LTS)
- MongoDB (Local or Atlas)

## Environment Variables

Create a `.env` file in the root directory (or rename `.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/vini-app # Or your Atlas URI
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## Local Development

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run locally (with hot reload):
    ```bash
    npm run dev
    ```

3.  Build and run production:
    ```bash
    npm run build
    npm start
    ```

## API Endpoints

### Auth
- `POST /api/auth/register` - { name, email, password }
- `POST /api/auth/login` - { email, password }

### Notes (Requires Bearer Token)
- `GET /api/notes` - Get all notes for user
- `POST /api/notes` - { title, body } - Create note
- `PUT /api/notes/:id` - { title, body } - Update note
- `DELETE /api/notes/:id` - Delete note

## Deployment

### Deploy to Render

1.  Create a new Web Service on Render.
2.  Connect your repository.
3.  Set Build Command: `npm install && npm run build`
4.  Set Start Command: `npm start`
5.  Add Environment Variables (`MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`).

### Deploy to Railway

1.  Create a new project on Railway.
2.  Connect your repository.
3.  Railway automatically detects `package.json`.
4.  Set Environment Variables in the settings.

### MongoDB Atlas

1.  Create a cluster.
2.  Create a database user.
3.  Get the connection string (SRV).
4.  Use this string as `MONGO_URI`.
