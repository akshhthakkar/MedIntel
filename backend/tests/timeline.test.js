const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");

const timelineRoutes = require("../src/routes/timeline.routes");
const User = require("../src/models/User");
const MedicalReport = require("../src/models/MedicalReport");
const Medication = require("../src/models/Medication");
const SymptomLog = require("../src/models/SymptomLog");

const app = express();
app.use(express.json());
app.use("/api/timeline", timelineRoutes);

const jwt = require("jsonwebtoken");

describe("Timeline API Integration Tests", () => {
  let userId;
  let token;

  beforeAll(async () => {
    const user = await User.create({
      name: "Timeline Tester",
      email: "timelinetest@example.com",
      password: "Password123!",
      dateOfBirth: "1985-05-15",
    });
    userId = user._id;

    // Generate valid JWT token for auth
    const rawToken = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || "test_jwt_secret",
      { expiresIn: "1h" },
    );
    token = `Bearer ${rawToken}`;

    // Seed some data across different collections for the timeline
    await MedicalReport.create({
      user: userId,
      title: "Blood Test",
      reportType: "blood_test",
      date: new Date(),
      extractedText: "Test",
      extractedData: {},
      aiAnalysis: {},
      originalFile: {
        filename: "test.pdf",
        mimetype: "application/pdf",
        path: "http://test.com",
        size: 100,
      },
    });

    await Medication.create({
      user: userId,
      name: "Aspirin",
      dosage: "100mg",
      frequency: "once_daily",
      customSchedule: [{ time: "09:00", label: "Morning" }],
      startDate: new Date(),
    });

    await SymptomLog.create({
      user: userId,
      symptoms: [{ name: "Fever", severity: 7 }],
      overallMood: "poor",
      date: new Date(),
    });
  });

  it("should fetch chronologically sorted timeline events", async () => {
    const res = await request(app)
      .get("/api/timeline")
      .set("Authorization", token)
      .set("x-user-id", userId.toString());

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const timeline = res.body.data.events;
    expect(timeline.length).toBe(3);

    // Sort order is descending (newest first)
    expect(timeline[0].type).toBe("symptom");
    expect(timeline[1].type).toBe("medication");
    expect(timeline[2].type).toBe("report");
  });

  it("should generate a dashboard summary containing all parts", async () => {
    const res = await request(app)
      .get("/api/timeline/dashboard")
      .set("Authorization", token)
      .set("x-user-id", userId.toString());

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const { summary } = res.body.data;
    expect(summary).toBeDefined();

    expect(summary.activeMedications).toHaveLength(1);
    expect(summary.recentReports).toHaveLength(1);
    expect(summary.symptomSummary.totalLogs).toBe(1);
  });
});
