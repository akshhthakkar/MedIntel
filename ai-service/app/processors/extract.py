import io
import logging

import pdfplumber
from PIL import Image

logger = logging.getLogger(__name__)

# Check if Tesseract is available
_tesseract_available = False
try:
    import pytesseract
    pytesseract.get_tesseract_version()
    _tesseract_available = True
    logger.info("Tesseract OCR is available")
except Exception:
    logger.warning("Tesseract OCR is NOT available. Image OCR will use basic mode.")


def extract_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF document using pdfplumber, falling back to OCR if text is empty."""
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text and len(page_text.strip()) > 20:
                    text += str(page_text) + "\n\n"
                elif _tesseract_available:
                    try:
                        logger.info(f"[OCR] Page {page.page_number} text empty/short. Running Tesseract OCR on rendered page...")
                        # Render page to image at 150 DPI
                        img = page.to_image(resolution=150).original
                        import pytesseract
                        ocr_txt = pytesseract.image_to_string(img)
                        if ocr_txt and len(ocr_txt.strip()) > 10:
                            text += ocr_txt + "\n\n"
                    except Exception as ocr_err:
                        logger.warning(f"[OCR] Failed to OCR page {page.page_number}: {str(ocr_err)}")
                        
    except Exception as e:
        logger.error(f"Error extracting from PDF: {str(e)}")
        
    return text.strip()


def extract_from_image(file_bytes: bytes) -> str:
    """Extract text from an image using Tesseract OCR if available."""
    try:
        image = Image.open(io.BytesIO(file_bytes))
        
        if _tesseract_available:
            import pytesseract
            text = pytesseract.image_to_string(image)
            if text and text.strip():
                return text.strip()
        
        # If Tesseract is not available or returned no text,
        # return image metadata so Gemini can still try to analyze
        width, height = image.size
        return f"[Medical report image uploaded. Dimensions: {width}x{height}px. Format: {image.format or 'unknown'}. OCR extraction was not available - please analyze based on any available context.]"
        
    except Exception as e:
        logger.error(f"Error extracting from Image: {str(e)}")
        return "[Medical report image uploaded but text extraction failed.]"


def extract_text(file_bytes: bytes, file_type: str) -> str:
    """Route the extraction request based on the file type."""
    file_type = file_type.lower()
    if file_type == 'pdf' or 'pdf' in file_type:
        return extract_from_pdf(file_bytes)
    else:
        return extract_from_image(file_bytes)
