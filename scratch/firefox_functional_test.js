// scratch/firefox_functional_test.js
const { firefox } = require('playwright');

(async () => {
  console.log('=================================================================');
  console.log(' STARTING MOZILLA FIREFOX FULL FUNCTIONAL E2E TEST IN CI');
  console.log('=================================================================');

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Load the local development page
    console.log('[Step 1] Loading Login Portal at http://localhost:5173...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // 2. Perform Secure Login as Admin (Auditor)
    console.log('[Step 2] Inputting secure credentials for Ramanath Satapathy (Admin)...');
    await page.fill('input[type="email"]', 'ramanath.satapathy@adityabirla.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 3. Handle DPDP Consent Modal
    console.log('[Step 3] Verification of DPDP Consent declaration sign-off...');
    await page.waitForSelector('button:has-text("Consent")', { timeout: 5000 });
    await page.click('button:has-text("Consent")');
    await page.waitForTimeout(2000);

    // 4. Verify Dashboard metrics load
    console.log('[Step 4] Auditing dashboard card metrics configurations...');
    await page.waitForSelector('div:has-text("Active Inventory")', { timeout: 5000 });
    console.log('✔ KPI dashboard tiles loaded successfully.');

    // 5. Navigate to Asset Inventory tab
    console.log('[Step 5] Checking Sidebar navigation to Asset Inventory...');
    await page.click('li:has-text("Asset Inventory")');
    await page.waitForSelector('th:has-text("Asset Tag")', { timeout: 5000 });
    console.log('✔ Asset Inventory table records successfully resolved.');

    // 6. Navigate to ISMS Registers tab
    console.log('[Step 6] Navigating to ISMS Registers subtabs...');
    await page.click('li:has-text("ISMS Registers")');
    await page.waitForSelector('button:has-text("Access Requests")', { timeout: 5000 });
    console.log('✔ ISMS registers tabs rendered successfully.');

    // 7. Verify Role-Specific User Manual PDF link is present
    console.log('[Step 7] Checking role-specific Help Manual link in sidebar...');
    const helpLinkText = await page.locator('.user-badge a').textContent();
    console.log(`✔ Found sidebar link: "${helpLinkText}"`);
    if (!helpLinkText.includes('Admin Operations Manual')) {
      throw new Error('Expected Admin Operations Manual link to be visible.');
    }

    console.log('=================================================================');
    console.log(' MOZILLA FIREFOX FUNCTIONAL CI TEST PASSED SUCCESSFULLY!');
    console.log('=================================================================');
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ E2E Mozilla Firefox functional test failed:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
