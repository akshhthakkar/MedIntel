const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

// Setup App mimicking server.js
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middlewares
app.use(mongoSanitize());
app.use(xss());

// Specific upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const reportRoutes = require("../src/routes/reports.routes");
const authRoutes = require("../src/routes/auth.routes");
const symptomRoutes = require("../src/routes/symptoms.routes");

app.use("/api/auth", authRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/reports", uploadLimiter, reportRoutes);

const User = require("../src/models/User");
const SymptomLog = require("../src/models/SymptomLog");

jest.mock("../src/services/reportProcessingService", () => ({
  processReport: jest.fn().mockResolvedValue("Mock Extracted Text"),
  determineTestStatus: jest.fn().mockReturnValue("normal"),
}));

jest.mock("../src/services/aiService", () => ({
  analyzeSymptomPatterns: jest.fn().mockResolvedValue(null),
  checkDrugInteractions: jest.fn().mockResolvedValue("No known interactions"),
}));

jest.mock("../src/services/schedulerService", () => ({
  scheduleReminder: jest.fn(),
  cancelJob: jest.fn(),
}));

jest.mock("../src/services/notificationService", () => ({
  sendMedicationReminder: jest.fn().mockResolvedValue(true),
  sendReportNotification: jest.fn().mockResolvedValue(true),
}));

describe("Security & Load API Integration Tests", () => {
  let userId;
  let token;

  const testUser = {
    name: "Security Tester",
    email: "sectest@example.com",
    password: "Password123!",
  };

  beforeAll(async () => {
    // Register the user natively
    const res = await request(app).post("/api/auth/register").send(testUser);
    userId = res.body.data.user._id;
    token = `Bearer ${res.body.data.token}`;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
  });

  it("should return 429 after exceeding rate limit", async () => {
    const dummyBuffer = Buffer.from("dummy");

    let rateLimited = false;
    let limitRes = null;

    // Firing 25 requests where max is 20
    for (let i = 0; i < 25; i++) {
      const res = await request(app)
        .post("/api/reports/upload")
        .set("Authorization", token)
        .set("x-user-id", userId.toString())
        .attach("report", dummyBuffer, "test.pdf");

      if (res.statusCode === 429) {
        rateLimited = true;
        limitRes = res;
        break;
      }
    }

    expect(rateLimited).toBe(true);
    // Express-rate-limit sends HTML by default if no message is set, our server mapping sends a custom message
    expect(limitRes.statusCode).toBe(429);
  });

  it("should sanitize NoSQL injection in login body", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: { $gt: "" },
        password: { $gt: "" },
      });

    // express-mongo-sanitize effectively strips the `$` keys and replaces them or nullifies them.
    // So the query will fail lookup, returning a standard 400 or 401 instead of a 200 payload.
    expect([400, 401, 500]).toContain(res.statusCode);
  });

  it("should sanitize XSS in symptom notes field", async () => {
    const maliciousNotes = "<script>alert('xss')</script> I feel dizzy";

    const res = await request(app)
      .post("/api/symptoms")
      .set("Authorization", token)
      .set("x-user-id", userId.toString())
      .send({
        date: new Date().toISOString(),
        mood: "poor",
        symptoms: [{ name: "Headache", severity: 5 }],
        notes: maliciousNotes,
      });

    expect(res.statusCode).toBe(201);

    // xss-clean escapes the html brackets preventing script execution
    const savedNotes = res.body.data.symptomLog.notes;
    expect(savedNotes).not.toContain("<script>");
    // xss-clean escapes < to &lt; but may leave > as-is
    expect(savedNotes).toContain("&lt;script");
    expect(savedNotes).toContain("&lt;/script");
  });

  it("should strip passwordHash from all API responses", async () => {
    // 1. Check profile responses
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", token);

    expect(meRes.body.data.user.password).toBeUndefined();
    expect(meRes.body.data.user.passwordHash).toBeUndefined();

    // 2. Check fetching empty reports array (ensuring nested populated users don't have it either)
    const reportsRes = await request(app)
      .get("/api/reports")
      .set("Authorization", token)
      .set("x-user-id", userId.toString());

    // Even if reports populate user, password shouldn't be there
    if (
      reportsRes.body?.data?.reports?.length > 0 &&
      reportsRes.body.data.reports[0].user
    ) {
      expect(reportsRes.body.data.reports[0].user.password).toBeUndefined();
    }
  });

  it("should reject requests with missing Authorization header format", async () => {
    const rawToken = token.split(" ")[1]; // extract jwt payload

    // Using "Token abc" instead of "Bearer abc"
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Token ${rawToken}`);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.toLowerCase()).toContain("no token provided");
  });
});
