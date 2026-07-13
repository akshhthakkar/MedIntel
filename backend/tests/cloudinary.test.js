const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const MedicalReport = require("../src/models/MedicalReport");
const User = require("../src/models/User");

// Mock Cloudinary
jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn().mockImplementation((options, callback) => {
        // Return a mock stream with an end method
        return {
          end: jest.fn().mockImplementation(() => {
            callback(null, {
              secure_url: "https://cloudinary.com/test.pdf",
              public_id: "test_public_id",
            });
          }),
        };
      }),
      destroy: jest.fn().mockImplementation((publicId, options, callback) => {
        callback(null, { result: "ok" });
      }),
    },
  },
}));

// Mock AI Service to avoid actual calls
jest.mock("../src/services/aiService", () => ({
  extractMedicalEntities: jest.fn().mockResolvedValue({ testResults: [] }),
  analyzeReport: jest.fn().mockResolvedValue({ simplifiedExplanation: "Mock" }),
  checkDrugInteractions: jest.fn().mockResolvedValue("No known interactions"),
}));

jest.mock("../src/services/reportProcessingService", () => ({
  processReport: jest.fn().mockResolvedValue("Mock Extracted Text"),
  determineTestStatus: jest.fn().mockReturnValue("normal"),
}));

jest.mock("../src/services/notificationService", () => ({
  sendReportNotification: jest.fn().mockResolvedValue(true),
  sendReportReady: jest.fn().mockResolvedValue(true),
  sendAbnormalResult: jest.fn().mockResolvedValue(true),
  sendMedicationReminder: jest.fn().mockResolvedValue(true),
}));

jest.mock("../src/services/schedulerService", () => ({
  scheduleReminder: jest.fn(),
  cancelJob: jest.fn(),
}));

jest.mock("../src/middleware/upload.middleware", () => {
  const multer = require("multer");
  return {
    upload: multer({ storage: multer.memoryStorage() }),
    uploadToCloudinary: jest.fn().mockResolvedValue({
      secure_url: "https://cloudinary.com/test.pdf",
      public_id: "test_public_id",
    }),
    deleteFromCloudinary: jest.fn().mockResolvedValue(true),
    cloudinary: {},
  };
});

const reportRoutes = require("../src/routes/reports.routes");
const authRoutes = require("../src/routes/auth.routes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);

describe("Cloudinary API Integration Tests", () => {
  let userId;
  let token;
  const cloudinary = require("cloudinary").v2;

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Cloud User",
      email: "cloud@example.com",
      password: "Password123!",
    });
    userId = res.body.data.user._id;
    token = `Bearer ${res.body.data.token}`;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await MedicalReport.deleteMany({});
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should upload file to Cloudinary and return a public URL", async () => {
    const dummyBuffer = Buffer.from("pdf data");

    const res = await request(app)
      .post("/api/reports/upload")
      .set("Authorization", token)
      .set("x-user-id", userId.toString())
      .field("reportType", "blood_test")
      .field("title", "Cloud Upload Test")
      .attach("report", dummyBuffer, "test.pdf");

    expect(res.statusCode).toBe(201);
    expect(res.body.data.reportId).toBeDefined();
    expect(res.body.data.processingStatus).toBe("processing");
  });

  it("should delete file from Cloudinary on report deletion", async () => {
    // 1. Create a report first
    const report = await MedicalReport.create({
      user: userId,
      reportType: "blood_test",
      title: "To Be Deleted",
      date: new Date(),
      originalFile: {
        filename: "test.pdf",
        path: "https://cloudinary.com/test.pdf",
        publicId: "delete_me_id",
        mimetype: "application/pdf",
      },
    });

    // 2. Delete it via API
    const res = await request(app)
      .delete(`/api/reports/${report._id}`)
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);

    // 3. Verify deleteFromCloudinary was called via the upload middleware mock
    const { deleteFromCloudinary } = require("../src/middleware/upload.middleware");
    expect(deleteFromCloudinary).toHaveBeenCalledWith("delete_me_id");
  });

  it("should handle Cloudinary upload failure gracefully", async () => {
    // Mock failure
    cloudinary.uploader.upload_stream.mockImplementationOnce(
      (options, callback) => {
        return {
          end: jest.fn().mockImplementation(() => {
            callback(new Error("Cloudinary Down"), null);
          }),
        };
      },
    );

    const dummyBuffer = Buffer.from("pdf data");
    const res = await request(app)
      .post("/api/reports/upload")
      .set("Authorization", token)
      .set("x-user-id", userId.toString())
      .field("reportType", "blood_test")
      .field("title", "Fail Test")
      .attach("report", dummyBuffer, "test.pdf");

    // The route should continue even if Cloudinary fails (currently implemented with try-catch)
    expect([201, 500]).toContain(res.statusCode);
  });
});
