const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const artifactDir = 'C:\\Users\\Aksh\\.gemini\\antigravity-ide\\brain\\1b20f429-c1da-44eb-ba7d-36c7b64b78cf';
  
  try {
    console.log("Navigating to landing page...");
    await page.goto('http://localhost:3000/');
    await page.screenshot({ path: path.join(artifactDir, 'qa_1_landing.png') });
    
    console.log("Navigating to register page...");
    await page.click('text=Get Started');
    await page.waitForURL('**/register');
    await page.screenshot({ path: path.join(artifactDir, 'qa_2_register_page.png') });
    
    console.log("Testing short password validation...");
    await page.fill('input[name="name"]', 'QA Tester');
    
    const testEmail = `qa_test_${Date.now()}@example.com`;
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'QA1234!');
    await page.fill('input[name="confirmPassword"]', 'QA1234!');
    await page.click('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);
    const errorText = await page.locator('.bg-red-50 p').innerText().catch(() => '');
    console.log("Validation error displayed (short password):", errorText);
    await page.screenshot({ path: path.join(artifactDir, 'qa_3_register_validation.png') });
    
    console.log("Testing correct registration...");
    await page.fill('input[name="password"]', 'QATester123!');
    await page.fill('input[name="confirmPassword"]', 'QATester123!');
    await page.click('button[type="submit"]');
    
    console.log("Waiting for dashboard...");
    await page.waitForURL('**/dashboard');
    console.log("Landed on dashboard.");
    await page.screenshot({ path: path.join(artifactDir, 'qa_4_dashboard.png') });
    
    console.log("Going to upload page...");
    await page.click('text=Upload Report');
    await page.waitForURL('**/upload');
    await page.screenshot({ path: path.join(artifactDir, 'qa_5_upload_page.png') });
    
    console.log("Uploading sample blood test...");
    await page.setInputFiles('input[type="file"]', 'c:\\Users\\Aksh\\Downloads\\medical-care-app\\sample_reports\\sample_blood_test.pdf');
    await page.selectOption('select#reportType', 'CBC');
    await page.selectOption('select#language', 'English');
    
    await page.screenshot({ path: path.join(artifactDir, 'qa_6_upload_ready.png') });
    await page.click('button:has-text("Upload & Analyze")');
    
    console.log("Waiting for report list to load...");
    await page.waitForURL('**/reports', { timeout: 30000 });
    console.log("Landed on reports list page.");
    await page.screenshot({ path: path.join(artifactDir, 'qa_7_reports_list.png') });
    
    console.log("Waiting for background AI processing...");
    await page.waitForSelector('text=sample_blood_test.pdf', { timeout: 15000 });
    await page.click('text=sample_blood_test.pdf');
    
    console.log("Waiting for analysis to complete on detail page...");
    await page.waitForSelector('text=AI Overall Summary', { timeout: 60000 });
    console.log("Report analysis completed successfully!");
    await page.screenshot({ path: path.join(artifactDir, 'qa_8_report_detail.png') });
    
    console.log("Going back to upload page to upload prescription...");
    await page.click('text=Upload Report');
    await page.waitForURL('**/upload');
    
    console.log("Uploading prescription...");
    await page.setInputFiles('input[type="file"]', 'c:\\Users\\Aksh\\Downloads\\medical-care-app\\sample_reports\\sample_prescription.pdf');
    await page.selectOption('select#reportType', 'other');
    await page.click('button:has-text("Upload & Analyze")');
    
    await page.waitForURL('**/reports', { timeout: 30000 });
    console.log("Prescription uploaded.");
    
    await page.waitForSelector('text=sample_prescription.pdf', { timeout: 15000 });
    await page.click('text=sample_prescription.pdf');
    
    console.log("Waiting for prescription analysis...");
    await page.waitForSelector('text=AI Overall Summary', { timeout: 60000 });
    await page.screenshot({ path: path.join(artifactDir, 'qa_9_prescription_detail.png') });
    
    const addMedButton = page.locator('button:has-text("Add to my medications")');
    if (await addMedButton.count() > 0) {
      console.log("Adding medication from prescription...");
      await addMedButton.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(artifactDir, 'qa_10_medication_added.png') });
    } else {
      console.log("No 'Add to my medications' button found on this report.");
    }
    
    console.log("Navigating to medications schedule...");
    await page.click('text=Medications');
    await page.waitForURL('**/medications');
    await page.screenshot({ path: path.join(artifactDir, 'qa_11_medications_list.png') });
    
    console.log("Logging out...");
    await page.click('text=Settings');
    await page.waitForURL('**/settings');
    await page.click('button[title="Log out"]');
    await page.waitForURL('**/login');
    console.log("Logged out successfully.");
    
    console.log("Testing duplicate email registration...");
    await page.click('text=create a new account');
    await page.waitForURL('**/register');
    await page.fill('input[name="name"]', 'Duplicate User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'QATester123!');
    await page.fill('input[name="confirmPassword"]', 'QATester123!');
    await page.click('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    const dupErrorText = await page.locator('.bg-red-50 p').innerText().catch(() => '');
    console.log("Duplicate registration validation error displayed:", dupErrorText);
    await page.screenshot({ path: path.join(artifactDir, 'qa_12_duplicate_register.png') });
    
    console.log("All testing steps completed successfully!");
  } catch (err) {
    console.error("TEST FAILED WITH ERROR:", err);
    await page.screenshot({ path: path.join(artifactDir, 'qa_error.png') });
  } finally {
    await browser.close();
  }
})();
