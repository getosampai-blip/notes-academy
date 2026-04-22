const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
require("dotenv").config();

const { db, run, get, all } = require("./db");
const logger = require("./logger");
const {verifyToken, generateToken } = require("./middleware");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("uploads"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later."
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later."
});

// File upload
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Notes API",
      version: "1.0.0",
      description: "Complete Notes Management API"
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  apis: ["./server.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Validation helpers
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password && password.length >= 6;

// Error handler
app.use((err, req, res, next) => {
  logger.error("Error:", err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "File upload error" });
  }
  res.status(500).json({ error: "Internal server error" });
});

// ============ HEALTH CHECK ============
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check server health
 *     responses:
 *       200:
 *         description: Server is running
 */
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// ============ AUTHENTICATION ============

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 */
app.post("/auth/signup", authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: "Password must be 6+ characters" });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be 3+ characters" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await run(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    const token = generateToken(result.lastID);
    logger.info("User registered:", username);
    
    res.status(201).json({
      id: result.lastID,
      username,
      email,
      token
    });
  } catch (err) {
    logger.error("Signup error:", err);
    if (err.message.includes("UNIQUE")) {
      return res.status(400).json({ error: "User already exists" });
    }
    res.status(500).json({ error: "Signup failed" });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 */
app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      logger.warn("Failed login:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id);
    logger.info("User logged in:", email);
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (err) {
    logger.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ============ CATEGORIES ============

app.get("/categories", verifyToken, async (req, res) => {
  try {
    const categories = await all(
      "SELECT * FROM categories WHERE userId = ? ORDER BY createdAt DESC",
      [req.userId]
    );
    res.json(categories || []);
  } catch (err) {
    logger.error("Get categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post("/categories", verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Category name required" });
    }

    const result = await run(
      "INSERT INTO categories (userId, name) VALUES (?, ?)",
      [req.userId, name]
    );
    
    res.status(201).json({
      id: result.lastID,
      userId: req.userId,
      name
    });
  } catch (err) {
    logger.error("Create category error:", err);
    if (err.message.includes("UNIQUE")) {
      return res.status(400).json({ error: "Category already exists" });
    }
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.delete("/categories/:id", verifyToken, async (req, res) => {
  try {
    const result = await run(
      "DELETE FROM categories WHERE id = ? AND userId = ?",
      [req.params.id, req.userId]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    res.json({ message: "Category deleted" });
  } catch (err) {
    logger.error("Delete category error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ============ TAGS ============

app.get("/tags", verifyToken, async (req, res) => {
  try {
    const tags = await all(
      "SELECT * FROM tags WHERE userId = ? ORDER BY name",
      [req.userId]
    );
    res.json(tags || []);
  } catch (err) {
    logger.error("Get tags error:", err);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

app.post("/tags", verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Tag name required" });
    }

    const result = await run(
      "INSERT INTO tags (userId, name) VALUES (?, ?)",
      [req.userId, name]
    );
    
    res.status(201).json({
      id: result.lastID,
      userId: req.userId,
      name
    });
  } catch (err) {
    logger.error("Create tag error:", err);
    if (err.message.includes("UNIQUE")) {
      return res.status(400).json({ error: "Tag already exists" });
    }
    res.status(500).json({ error: "Failed to create tag" });
  }
});

// ============ NOTES ============

app.get("/notes", verifyToken, async (req, res) => {
  try {
    const { search, categoryId, tagId } = req.query;
    
    let query = "SELECT DISTINCT n.* FROM notes n WHERE n.userId = ?";
    const params = [req.userId];

    if (categoryId) {
      query += " AND n.categoryId = ?";
      params.push(categoryId);
    }

    if (search) {
      query += " AND (n.title LIKE ? OR n.content LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (tagId) {
      query += ` AND n.id IN (SELECT noteId FROM note_tags WHERE tagId = ?)`;
      params.push(tagId);
    }

    query += " ORDER BY n.updatedAt DESC";

    const notes = await all(query, params);
    res.json(notes || []);
  } catch (err) {
    logger.error("Get notes error:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.get("/notes/:id", verifyToken, async (req, res) => {
  try {
    const note = await get(
      "SELECT * FROM notes WHERE id = ? AND userId = ?",
      [req.params.id, req.userId]
    );
    
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const tags = await all(`
      SELECT t.* FROM tags t
      JOIN note_tags nt ON t.id = nt.tagId
      WHERE nt.noteId = ?
    `, [req.params.id]);
    
    res.json({ ...note, tags: tags || [] });
  } catch (err) {
    logger.error("Get note error:", err);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

app.post("/notes", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { title, content, categoryId, tagIds } = req.body;

    if (!title || !content) {
      if (req.file) {
        require("fs").unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "Title and content required" });
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const result = await run(
      `INSERT INTO notes (userId, categoryId, title, content, fileUrl)
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId, categoryId || null, title, content, fileUrl]
    );

    if (tagIds && Array.isArray(tagIds)) {
      for (const tagId of tagIds) {
        await run("INSERT INTO note_tags (noteId, tagId) VALUES (?, ?)", 
          [result.lastID, tagId]);
      }
    }

    logger.info("Note created:", result.lastID);
    res.status(201).json({
      id: result.lastID,
      userId: req.userId,
      categoryId: categoryId || null,
      title,
      content,
      fileUrl,
      createdAt: new Date()
    });
  } catch (err) {
    logger.error("Create note error:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.put("/notes/:id", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { title, content, categoryId, tagIds } = req.body;

    if (!title || !content) {
      if (req.file) {
        require("fs").unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "Title and content required" });
    }

    const note = await get(
      "SELECT * FROM notes WHERE id = ? AND userId = ?",
      [req.params.id, req.userId]
    );

    if (!note) {
      if (req.file) {
        require("fs").unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: "Note not found" });
    }

    if (req.file && note.fileUrl) {
      const oldPath = path.join(__dirname, note.fileUrl);
      if (require("fs").existsSync(oldPath)) {
        require("fs").unlinkSync(oldPath);
      }
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : note.fileUrl;

    await run(
      `UPDATE notes SET title = ?, content = ?, categoryId = ?, fileUrl = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, content, categoryId || null, fileUrl, req.params.id]
    );

    if (tagIds && Array.isArray(tagIds)) {
      await run("DELETE FROM note_tags WHERE noteId = ?", [req.params.id]);
      for (const tagId of tagIds) {
        await run("INSERT INTO note_tags (noteId, tagId) VALUES (?, ?)", 
          [req.params.id, tagId]);
      }
    }

    logger.info("Note updated:", req.params.id);
    res.json({
      id: req.params.id,
      userId: req.userId,
      categoryId: categoryId || null,
      title,
      content,
      fileUrl,
      updatedAt: new Date()
    });
  } catch (err) {
    logger.error("Update note error:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

app.delete("/notes/:id", verifyToken, async (req, res) => {
  try {
    const note = await get(
      "SELECT * FROM notes WHERE id = ? AND userId = ?",
      [req.params.id, req.userId]
    );

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (note.fileUrl) {
      const filePath = path.join(__dirname, note.fileUrl);
      if (require("fs").existsSync(filePath)) {
        require("fs").unlinkSync(filePath);
      }
    }

    await run("DELETE FROM note_tags WHERE noteId = ?", [req.params.id]);
    await run("DELETE FROM notes WHERE id = ?", [req.params.id]);

    logger.info("Note deleted:", req.params.id);
    res.json({ message: "Note deleted" });
  } catch (err) {
    logger.error("Delete note error:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`API Documentation at http://localhost:${PORT}/api-docs`);
});

module.exports = app;