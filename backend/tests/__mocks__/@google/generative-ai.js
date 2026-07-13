module.exports = {
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            overallSummary: "Mocked AI analysis summary",
            testResults: [
              {
                testName: "Hemoglobin",
                value: "14.5",
                unit: "g/dL",
                normalRange: "13.8 - 17.2",
                status: "Normal",
                explanation: "Your hemoglobin is within normal limits.",
                symptoms: [],
                remedies: []
              }
            ],
            symptoms: ["Fatigue"],
            remedies: ["Rest"],
            urgencyLevel: "normal"
          })
        }
      })
    })
  }))
};
