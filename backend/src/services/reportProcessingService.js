const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");

class ReportProcessingService {
  async extractTextFromPDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error("PDF Extraction Error:", error.message);
      throw new Error("Failed to extract text from PDF");
    }
  }

  async extractTextFromImage(buffer) {
    try {
      const result = await Tesseract.recognize(buffer, "eng", {
        logger: (info) => console.log(info),
      });
      return result.data.text;
    } catch (error) {
      console.error("OCR Error:", error.message);
      throw new Error("Failed to extract text from image");
    }
  }

  async processReport(file) {
    let extractedText = "";

    if (file.mimetype === "application/pdf") {
      extractedText = await this.extractTextFromPDF(file.buffer);
    } else if (file.mimetype.startsWith("image/")) {
      extractedText = await this.extractTextFromImage(file.buffer);
    } else {
      throw new Error("Unsupported file type");
    }

    return extractedText;
  }

  determineTestStatus(value, normalRange) {
    if (!normalRange || !value) return "normal";

    // Simple logic - can be enhanced
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "normal";

    // Extract range values
    const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (rangeMatch) {
      const [_, min, max] = rangeMatch;
      const minVal = parseFloat(min);
      const maxVal = parseFloat(max);

      if (numValue < minVal) return "low";
      if (numValue > maxVal) return "high";
      if (numValue > maxVal * 1.5 || numValue < minVal * 0.5) return "critical";
    }

    return "normal";
  }

  extractMedicationSchedule(medication) {
    const { frequency, customSchedule } = medication;

    if (customSchedule && customSchedule.length > 0) {
      return customSchedule;
    }

    // Generate default schedules based on frequency
    const schedules = {
      once_daily: [{ time: "09:00", label: "Morning" }],
      twice_daily: [
        { time: "09:00", label: "Morning" },
        { time: "21:00", label: "Night" },
      ],
      thrice_daily: [
        { time: "09:00", label: "Morning" },
        { time: "14:00", label: "Afternoon" },
        { time: "21:00", label: "Night" },
      ],
      four_times_daily: [
        { time: "08:00", label: "Morning" },
        { time: "12:00", label: "Noon" },
        { time: "16:00", label: "Evening" },
        { time: "20:00", label: "Night" },
      ],
      every_6_hours: [
        { time: "06:00", label: "Morning" },
        { time: "12:00", label: "Afternoon" },
        { time: "18:00", label: "Evening" },
        { time: "00:00", label: "Midnight" },
      ],
      every_8_hours: [
        { time: "08:00", label: "Morning" },
        { time: "16:00", label: "Evening" },
        { time: "00:00", label: "Midnight" },
      ],
      every_12_hours: [
        { time: "09:00", label: "Morning" },
        { time: "21:00", label: "Night" },
      ],
    };

    return schedules[frequency] || [{ time: "09:00", label: "Morning" }];
  }

  // Drug interaction database (simplified - in production use external API)
  checkDrugInteractions(medications) {
    const interactions = [];
    const commonInteractions = {
      aspirin: {
        with: ["warfarin", "ibuprofen"],
        severity: "moderate",
        description: "May increase bleeding risk",
      },
      metformin: {
        with: ["alcohol"],
        severity: "moderate",
        description: "May increase risk of lactic acidosis",
      },
      warfarin: {
        with: ["aspirin", "ibuprofen"],
        severity: "severe",
        description: "Significantly increases bleeding risk",
      },
    };

    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i].name.toLowerCase();
        const med2 = medications[j].name.toLowerCase();

        if (commonInteractions[med1]?.with.includes(med2)) {
          interactions.push({
            medication1: medications[i].name,
            medication2: medications[j].name,
            ...commonInteractions[med1],
          });
        }
      }
    }

    return interactions;
  }

  getMedicationWarnings(medicationName) {
    const warnings = {
      aspirin: [
        "Do not take on empty stomach",
        "May cause stomach irritation",
        "Avoid alcohol",
      ],
      metformin: [
        "Take with food",
        "Avoid excessive alcohol",
        "Monitor blood sugar regularly",
      ],
      paracetamol: [
        "Do not exceed 4g per day",
        "Avoid alcohol",
        "Can be taken with or without food",
      ],
    };

    const name = medicationName.toLowerCase();
    return (
      warnings[name] || ["Follow doctor's instructions", "Take as prescribed"]
    );
  }
}

module.exports = new ReportProcessingService();
