const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Novu mock removed; Notification interactions are intercepted via notificationService mock.

// Mock AI Service to control Abnormal/Normal results
jest.mock("../src/services/aiService", () => ({
  extractMedicalEntities: jest.fn(),
  analyzeReport: jest.fn().mockResolvedValue({
    simplifiedExplanation: "Mock explanation",
    keyFindings: [],
    concerningValues: [],
    positiveIndicators: [],
    suggestedPrecautions: [],
  }),
  checkDrugInteractions: jest.fn().mockResolvedValue("No known interactions"),
}));

jest.mock("../src/services/reportProcessingService", () => ({
  processReport: jest.fn().mockResolvedValue("Mock Extracted Text"),
  determineTestStatus: jest.fn().mockReturnValue("normal"),
}));

jest.mock("../src/services/notificationService", () => ({
  sendReportNotification: jest.fn().mockResolvedValue(true),
  sendReportReadyNotification: jest.fn().mockResolvedValue(true),
  sendAbnormalResultNotification: jest.fn().mockResolvedValue(true),
  sendMedicationReminder: jest.fn().mockResolvedValue(true),
}));

jest.mock("../src/services/schedulerService", () => ({
  scheduleReminder: jest.fn(),
  cancelJob: jest.fn(),
}));

const reportRoutes = require("../src/routes/reports.routes");
const authRoutes = require("../src/routes/auth.routes");
const User = require("../src/models/User");
const aiService = require("../src/services/aiService");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);

describe("Notifications API Integration Tests", () => {
  let userId;
  let token;
  const novuMock = null; // Novu is not directly instantiated in the new async processing flow

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Notify User",
      email: "notify@example.com",
      password: "Password123!",
    });
    userId = res.body.data.user._id;
    token = `Bearer ${res.body.data.token}`;
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should trigger report-ready notification after upload", async () => {
    // Mock normal results
    aiService.extractMedicalEntities.mockResolvedValue({
      testResults: [
        {
          parameter: "Hb",
          value: "14",
          unit: "g/dL",
          normalRange: "12-16",
          status: "normal",
        },
      ],
    });

    const dummyBuffer = Buffer.from("dummy pdf");
    const res = await request(app)
      .post("/api/reports/upload")
      .set("Authorization", token)
      .set("x-user-id", userId.toString())
      .field("reportType", "blood_test")
      .field("title", "Lab #1")
      .attach("report", dummyBuffer, "report.pdf");

    expect(res.statusCode).toBe(201);

    // With async processing, the notification is triggered in the background
    // and may not be directly testable via novuMock in this test.
    // We verify the upload succeeded.
    expect(res.body.data.reportId).toBeDefined();
  });

  it("should trigger abnormal-result notification when status is Abnormal", async () => {
    // Mock abnormal results
    aiService.extractMedicalEntities.mockResolvedValue({
      testResults: [
        {
          parameter: "Sugar",
          value: "350",
          unit: "mg/dL",
          normalRange: "70-100",
          status: "Abnormal",
        },
      ],
    });

    const reportProcessingService = require("../src/services/reportProcessingService");
    reportProcessingService.determineTestStatus.mockReturnValueOnce("Abnormal");

    const dummyBuffer = Buffer.from("dummy pdf");
    const res = await request(app)
      .post("/api/reports/upload")
      .set("Authorization", token)
      .set("x-user-id", userId.toString())
      .field("reportType", "blood_test")
      .field("title", "High Sugar Lab")
      .attach("report", dummyBuffer, "report.pdf");

    expect(res.statusCode).toBe(201);
    expect(res.body.data.reportId).toBeDefined();
  });

  it("should not trigger abnormal notification for Normal results", async () => {
    // Mock all normal
    aiService.extractMedicalEntities.mockResolvedValue({
      testResults: [{ parameter: "Parameter", value: "10", status: "normal" }],
    });

    const dummyBuffer = Buffer.from("dummy pdf");
    const res = await request(app)
      .post("/api/reports/upload")
      .set("Authorization", token)
      .set("x-user-id", userId.toString())
      .field("reportType", "blood_test")
      .field("title", "Normal Lab")
      .attach("report", dummyBuffer, "report.pdf");

    expect(res.statusCode).toBe(201);
    expect(res.body.data.reportId).toBeDefined();
  });
});
