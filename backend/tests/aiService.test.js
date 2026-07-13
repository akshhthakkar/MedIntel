const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

// Mock axios globally
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { results: [] } })
}));

// We mock @google/generative-ai globally before loading aiService
const mockGenerateContent = jest.fn();
jest.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  };
});

// Mock environment variable before requiring aiService
process.env.GEMINI_API_KEY = "test_key";
process.env.GEMINI_MODEL = "gemini-1.5-flash";
process.env.GROQ_API_KEY = "";

const aiService = require("../src/services/aiService");

describe("aiService", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    axios.get.mockClear();
  });

  // ─── analyzeReport ───

  it("should analyze report and return parsed JSON", async () => {
    const mockResponse = {
      reportType: "CBC Blood Test",
      language: "English",
      testResults: [],
      keyFindings: ["Finding 1"],
      concerningValues: [],
      positiveIndicators: ["Healthy"],
      overallSummary: "All values normal",
      urgencyLevel: "routine",
      suggestedPrecautions: ["Rest"],
    };

    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(mockResponse) },
    });

    const result = await aiService.analyzeReport(
      "CBC showing Hemoglobin 14 g/dL range 12-16",
      "Blood Test",
    );

    expect(result).toHaveProperty("keyFindings");
    expect(result.keyFindings).toContain("Finding 1");
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("should return fallback for very short text", async () => {
    const result = await aiService.analyzeReport("Hi", "X-Ray");

    // Short text (<20 chars) triggers fallback immediately, no API call
    expect(result).toHaveProperty("overallSummary");
    expect(result.urgencyLevel).toBe("routine");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("should return fallback when Gemini returns non-JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "This is not JSON text without curly braces" },
    });

    const result = await aiService.analyzeReport(
      "CBC showing Hemoglobin 14 g/dL range 12-16",
      "Test",
    );

    // parseJSON returns null → fallback
    expect(result.overallSummary).toContain("unavailable");
  });

  // ─── extractMedicalEntities ───

  it("should extract medical entities and return parsed JSON", async () => {
    const mockResponse = {
      testResults: [],
      diagnoses: ["Influenza"],
      medications: [],
      observations: ["Fever noted"],
      recommendations: ["Rest"],
    };

    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(mockResponse) },
    });

    const result = await aiService.extractMedicalEntities(
      "Patient has flu with fever of 101 F",
    );

    expect(result).toHaveProperty("diagnoses");
    expect(result.diagnoses).toContain("Influenza");
  });

  // ─── Gemini (not OpenAI) ───

  it("should call Gemini API, not OpenAI", async () => {
    // Verify that @google/generative-ai is loaded and provides GoogleGenerativeAI
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    expect(GoogleGenerativeAI).toBeDefined();

    // The test explicitly asks to assert 'openai' was never required
    const openaiLoaded = Object.keys(require.cache).some((key) =>
      key.includes("openai"),
    );
    expect(openaiLoaded).toBe(false);

    // Trigger the model initialization to prove Gemini is used
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify({ simplifiedExplanation: "ok" }) },
    });
    await aiService.analyzeReport("test text of sufficient length for analysis", "Blood Test");
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  // ─── NER output schema ───

  it("should always return valid NER output schema", async () => {
    const validResponse = {
      testResults: [
        {
          testName: "WBC",
          value: "7.5",
          unit: "10^9/L",
          normalRange: "4.5-11.0",
          status: "Normal",
        },
      ],
      diagnoses: ["Healthy"],
      medications: [],
      observations: ["Patient is well"],
      recommendations: ["Maintain diet"],
    };

    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validResponse) },
    });

    const inputs = [
      "CBC showing normal WBC at 7.5 10^9/L (4.5-11.0)",
      "LFT is completely within normal limits for the patient",
      "Lipid panel shows slightly elevated LDL cholesterol",
    ];

    for (const input of inputs) {
      const result = await aiService.extractMedicalEntities(input);
      expect(result).toHaveProperty("testResults");
      expect(result).toHaveProperty("diagnoses");
      expect(result).toHaveProperty("medications");
      expect(Array.isArray(result.testResults)).toBe(true);
    }
  });

  // ─── Edge cases ───

  it("should handle completely empty/blank report input", async () => {
    // Empty text should return fallback without calling the API
    const result = await aiService.analyzeReport("", "Unknown");

    expect(result).toBeDefined();
    expect(result).toHaveProperty("overallSummary");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("should handle partial/incomplete report text", async () => {
    const partialResponse = {
      testResults: [
        {
          testName: "Hemoglobin",
          value: "14",
          unit: null,
          normalRange: "Unknown",
          status: "Normal",
        },
      ],
      diagnoses: [],
      medications: [],
      observations: [],
      recommendations: [],
    };

    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(partialResponse) },
    });

    const result = await aiService.extractMedicalEntities(
      "Hemoglobin is 14 with no units or ranges specified",
    );

    expect(result.testResults[0].unit).toBeNull();
    expect(result.testResults[0].normalRange).toBe("Unknown");
  });

  // ─── checkDrugInteractions ───

  it("should check drug interactions", async () => {
    const result = await aiService.checkDrugInteractions([
      { name: "Lisinopril", dosage: "10mg" },
      { name: "Metformin", dosage: "500mg" },
      { name: "Ibuprofen", dosage: "400mg" },
    ]);

    expect(Array.isArray(result)).toBe(true);
    expect(axios.get).toHaveBeenCalled();
  });

  it("should return empty array for insufficient medications", async () => {
    const result = await aiService.checkDrugInteractions([{ name: "Ibuprofen" }]);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
    expect(axios.get).not.toHaveBeenCalled();
  });
});
