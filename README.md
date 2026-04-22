# Notes API Backend

A complete, production-ready Notes Management API with user authentication, categories, tags, file uploads, and more.

## Features

✅ **User Authentication** - Secure signup/login with JWT tokens  
✅ **Notes CRUD** - Create, Read, Update, Delete notes  
✅ **Categories** - Organize notes by categories  
✅ **Tags** - Add multiple tags to notes  
✅ **Search** - Full-text search on notes  
✅ **File Uploads** - Attach files to notes (up to 10MB)  
✅ **Rate Limiting** - Protect API from abuse  
✅ **Logging** - Comprehensive logging with Winston  
✅ **API Documentation** - Interactive Swagger UI  
✅ **Testing** - Unit and integration tests with Jest  
✅ **Database** - SQLite with proper schema  

## Tech Stack

- **Node.js & Express** - Web framework
- **SQLite (better-sqlite3)** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **Express Rate Limit** - Rate limiting
- **Winston** - Logging
- **Swagger** - API documentation
- **Jest & Supertest** - Testing

## Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables** (`.env`):
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
LOG_LEVEL=info
```

3. **Start the server:**
```bash
npm start
```

The server will run on `http://localhost:5000`

## Available Scripts

```bash
npm start              # Start production server
npm run dev          # Start with auto-reload (watch mode)
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## API Endpoints

### Health
- `GET /health` - Check server status

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user

### Categories
- `GET /categories` - Get all categories
- `POST /categories` - Create category
- `DELETE /categories/:id` - Delete category

### Tags
- `GET /tags` - Get all tags
- `POST /tags` - Create tag

### Notes
- `GET /notes` - Get all notes (with search/filter)
  - Query params: `search`, `categoryId`, `tagId`
- `GET /notes/:id` - Get single note
- `POST /notes` - Create note (supports file upload)
- `PUT /notes/:id` - Update note
- `DELETE /notes/:id` - Delete note

## API Documentation

Interactive API documentation is available at:
```
http://localhost:5000/api-docs
```

## Authentication

All protected routes require a JWT token in the Authorization header:

```bash
Authorization: Bearer <token>
```

Tokens are returned from signup/login endpoints and expire after 7 days.

## File Uploads

Upload files when creating/updating notes:

```bash
curl -X POST http://localhost:5000/notes \
  -H "Authorization: Bearer <token>" \
  -F "title=My Note" \
  -F "content=Note content" \
  -F "file=@/path/to/file"
```

Files are stored in the `uploads/` directory (max 10MB).

## Database Schema

The SQLite database includes tables for:
- `users` - User accounts
- `notes` - Note data
- `categories` - Note categories
- `tags` - Tags
- `note_tags` - Note-tag associations

Database file: `notes.db` (auto-created on first run)

## Logging

Logs are stored in the `logs/` directory:
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs

Console output is enabled in development mode.

## Rate Limiting

- General endpoints: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per 15 minutes per IP

## Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- Authentication (signup, login)
- CRUD operations (create, read, update, delete)
- Categories management
- Tags management
- Protected routes
- Error handling

## Deployment

### Environment Variables for Production

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=generate-a-strong-random-key-here
LOG_LEVEL=warn
```

### Deploy to Heroku

1. Install Heroku CLI
2. Create a Procfile:
```
web: node server.js
```

3. Deploy:
```bash
heroku login
heroku create your-app-name
git push heroku main
```

### Deploy to Railway/Render

1. Connect your Git repository
2. Set environment variables in the platform
3. Deploy

### Deploy to AWS/DigitalOcean

1. Set up a Linux server (Ubuntu 20.04+)
2. Install Node.js and npm
3. Clone repository and install dependencies
4. Use PM2 to manage the process:
```bash
npm install -g pm2
pm2 start server.js --name "notes-api"
pm2 save
pm2 startup
```

## Security Considerations

- ✅ Passwords are hashed with bcrypt
- ✅ JWT tokens have expiration (7 days)
- ✅ Rate limiting prevents brute force attacks
- ✅ CORS is configured
- ✅ File uploads are size-limited
- ✅ All inputs are validated

**For production, ensure:**
- Change JWT_SECRET to a strong random key
- Set NODE_ENV=production
- Use HTTPS/SSL
- Configure proper CORS origins
- Add database backups
- Set up monitoring and alerts
- Regularly update dependencies

## Error Handling

All endpoints return structured error responses:

```json
{
  "error": "Descriptive error message"
}
```

HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `404` - Not found
- `500` - Server error

## Development

### Project Structure

```
├── server.js           # Main application
├── db.js              # Database setup
├── middleware.js      # Auth middleware
├── logger.js          # Logging setup
├── server.test.js     # Tests
├── package.json       # Dependencies
├── .env               # Environment variables
├── uploads/           # File uploads (gitignored)
├── logs/              # Log files (gitignored)
└── notes.db           # SQLite database (gitignored)
```

### Adding New Features

1. Update database schema in `db.js` if needed
2. Add routes to `server.js`
3. Add tests to `server.test.js`
4. Update Swagger comments for documentation
5. Test with `npm test`

## Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env or kill the process
lsof -i :5000
kill -9 <PID>
```

**Database locked error:**
- Close any open connections
- Delete `notes.db` to reset (WARNING: loses all data)

**File upload not working:**
- Ensure `uploads/` directory exists
- Check file size is under 10MB
- Verify disk space availability

## Support & Contributing

For issues or contributions, please visit the repository.

## License

MIT
