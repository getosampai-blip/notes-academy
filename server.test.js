const request = require("supertest");
const app = require("./server");

describe("Notes API", () => {
  let authToken;
  let userId;
  let noteId;

  // Test Auth Signup
  describe("POST /auth/signup", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/auth/signup").send({
        username: "testuser",
        email: "test@example.com",
        password: "password123"
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("id");
      
      authToken = res.body.token;
      userId = res.body.id;
    });

    it("should fail with invalid email", async () => {
      const res = await request(app).post("/auth/signup").send({
        username: "testuser2",
        email: "invalid-email",
        password: "password123"
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should fail with short password", async () => {
      const res = await request(app).post("/auth/signup").send({
        username: "testuser3",
        email: "test3@example.com",
        password: "123"
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  // Test Auth Login
  describe("POST /auth/login", () => {
    it("should login with valid credentials", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "password123"
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
    });

    it("should fail with invalid credentials", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "wrongpassword"
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // Test Notes CRUD
  describe("Notes CRUD Operations", () => {
    it("POST /notes - should create a note", async () => {
      const res = await request(app)
        .post("/notes")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Test Note",
          content: "This is a test note"
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.title).toBe("Test Note");
      
      noteId = res.body.id;
    });

    it("GET /notes - should get all notes", async () => {
      const res = await request(app)
        .get("/notes")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /notes/:id - should get a specific note", async () => {
      const res = await request(app)
        .get(`/notes/${noteId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(noteId);
    });

    it("PUT /notes/:id - should update a note", async () => {
      const res = await request(app)
        .put(`/notes/${noteId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Note",
          content: "Updated content"
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe("Updated Note");
    });

    it("DELETE /notes/:id - should delete a note", async () => {
      const res = await request(app)
        .delete(`/notes/${noteId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message");
    });
  });

  // Test Categories
  describe("Categories", () => {
    let categoryId;

    it("POST /categories - should create a category", async () => {
      const res = await request(app)
        .post("/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Work"
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      
      categoryId = res.body.id;
    });

    it("GET /categories - should get all categories", async () => {
      const res = await request(app)
        .get("/categories")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("DELETE /categories/:id - should delete a category", async () => {
      const res = await request(app)
        .delete(`/categories/${categoryId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // Test Tags
  describe("Tags", () => {
    let tagId;

    it("POST /tags - should create a tag", async () => {
      const res = await request(app)
        .post("/tags")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Important"
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      
      tagId = res.body.id;
    });

    it("GET /tags - should get all tags", async () => {
      const res = await request(app)
        .get("/tags")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // Test Protected Routes
  describe("Protected Routes", () => {
    it("should fail without token", async () => {
      const res = await request(app).get("/notes");

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("should fail with invalid token", async () => {
      const res = await request(app)
        .get("/notes")
        .set("Authorization", "Bearer invalid-token");

      expect(res.statusCode).toBe(401);
    });
  });

  // Test Health Check
  describe("GET /health", () => {
    it("should return server status", async () => {
      const res = await request(app).get("/health");

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("status");
      expect(res.body.status).toBe("OK");
    });
  });
});
