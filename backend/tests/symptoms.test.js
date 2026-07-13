const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");

// Mock external services
jest.mock("../src/services/aiService", () => ({
  analyzeSymptomPatterns: jest.fn().mockResolvedValue({
    patterns: ["Frequent morning headaches"],
    recommendations: ["Stay hydrated"],
    urgencyLevel: "low",
  }),
  checkDrugInteractions: jest.fn().mockResolvedValue("No known interactions"),
}));

const symptomsRoutes = require("../src/routes/symptoms.routes");
const User = require("../src/models/User");
const SymptomLog = require("../src/models/SymptomLog");

const app = express();
app.use(express.json());
app.use("/api/symptoms", symptomsRoutes);

const jwt = require("jsonwebtoken");

describe("Symptoms API Integration Tests", () => {
  let userId;
  let token;
  let symptomId;

  const testSymptomLog = {
    symptoms: [
      {
        name: "Headache",
        severity: 6,
        duration: "2 hours",
        notes: "Throbbing pain",
      },
      { name: "Nausea", severity: 4, duration: "1 hour" },
    ],
    mood: "poor",
    vitalSigns: {
      temperature: 37.5,
      bloodPressure: { systolic: 120, diastolic: 80 },
      heartRate: 85,
    },
    date: new Date().toISOString(),
  };

  beforeAll(async () => {
    const user = await User.create({
      name: "Symptom Tester",
      email: "symptomtest@example.com",
      password: "Password123!",
    });
    userId = user._id;

    // Generate valid JWT token for auth
    const rawToken = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || "test_jwt_secret",
      { expiresIn: "1h" },
    );
    token = `Bearer ${rawToken}`;
  });

  it("should log a new symptom entry", async () => {
    const res = await request(app)
      .post("/api/symptoms")
      .set("Authorization", token)
      .set("x-user-id", userId.toString())
      .send(testSymptomLog);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.symptomLog.symptoms).toHaveLength(2);
    expect(res.body.data.symptomLog.mood).toBe("poor");

    symptomId = res.body.data.symptomLog._id;
  });

  it("should get all symptom logs", async () => {
    const res = await request(app)
      .get("/api/symptoms")
      .set("Authorization", token)
      .set("x-user-id", userId.toString());

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.symptoms.length).toBeGreaterThan(0);
    expect(res.body.data.symptoms[0].symptoms[0].name).toBe("Headache");
  });

  it("should get symptom trends", async () => {
    const res = await request(app)
      .get("/api/symptoms/trends/mood?days=7")
      .set("Authorization", token)
      .set("x-user-id", userId.toString());

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("trends");
  });

  it("should delete a symptom log", async () => {
    const res = await request(app)
      .delete(`/api/symptoms/${symptomId}`)
      .set("Authorization", token)
      .set("x-user-id", userId.toString());

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify deletion
    const getRes = await request(app)
      .get("/api/symptoms")
      .set("Authorization", token)
      .set("x-user-id", userId.toString());

    expect(getRes.body.data.symptoms).toHaveLength(0);
  });
});
