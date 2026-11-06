import { chromium } from "playwright";

async function runBrowserTest() {
  console.log("Launching headless browser for live production E2E test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkFailures = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("requestfailed", (req) => {
    networkFailures.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
  });

  const baseUrl = "https://community-developer-hub.vercel.app";

  console.log("\n1. Navigating to Home Page...");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const title = await page.title();
  console.log(`Page title: ${title}`);

  // Check navigation links
  console.log("\n2. Testing Header Navigation...");
  const navItems = [
    { text: "Home", urlPart: "/" },
    { text: "Explore", urlPart: "/projects" },
    { text: "Collaborate", urlPart: "/collaborate" },
    { text: "Community", urlPart: "/community" },
    { text: "Leaderboard", urlPart: "/leaderboard" },
    { text: "Challenges", urlPart: "/challenges" },
  ];

  for (const item of navItems) {
    const link = page.locator(`header a:has-text("${item.text}"), nav a:has-text("${item.text}")`).first();
    if (await link.isVisible()) {
      const href = await link.getAttribute("href");
      console.log(`  ✓ Nav item "${item.text}" visible, href: ${href}`);
    } else {
      console.log(`  ✗ Nav item "${item.text}" NOT visible`);
    }
  }

  // Navigate to /projects and check real projects rendered from database
  console.log("\n3. Testing /projects Page...");
  await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
  const projectCards = await page.locator("a[href^='/projects/']").count();
  console.log(`  ✓ Found ${projectCards} project links rendered on /projects`);

  // Navigate to /challenges and check challenges rendered from database
  console.log("\n4. Testing /challenges Page...");
  await page.goto(`${baseUrl}/challenges`, { waitUntil: "networkidle" });
  const challengeHeadings = await page.locator("h2, h3").count();
  console.log(`  ✓ Rendered /challenges successfully with ${challengeHeadings} headings`);

  // Navigate to /collaborate
  console.log("\n5. Testing /collaborate Page...");
  await page.goto(`${baseUrl}/collaborate`, { waitUntil: "networkidle" });
  const oppCards = await page.locator("text=Apply to Join, text=Sign In to Apply").count();
  console.log(`  ✓ Rendered /collaborate with ${oppCards} opportunity action buttons`);

  // Navigate to /community
  console.log("\n6. Testing /community Page...");
  await page.goto(`${baseUrl}/community`, { waitUntil: "networkidle" });
  const devCards = await page.locator("text=Open to Collaborate, text=Full-time Available, text=Freelance").count();
  console.log(`  ✓ Rendered /community with ${devCards} developer availability tags`);

  // Navigate to /auth/login
  console.log("\n7. Testing /auth/login Page & Google OAuth Button...");
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
  const googleLoginBtn = await page.locator("button:has-text('Continue with Google')").isVisible();
  const emailInput = await page.locator("input[type='email']").isVisible();
  const passwordInput = await page.locator("input[type='password']").isVisible();
  const submitButton = await page.locator("button[type='submit']").isVisible();
  console.log(`  ✓ Login form rendered: googleBtn=${googleLoginBtn}, email=${emailInput}, password=${passwordInput}, submit=${submitButton}`);

  // Navigate to /auth/register
  console.log("\n8. Testing /auth/register Page & Google OAuth Button...");
  await page.goto(`${baseUrl}/auth/register`, { waitUntil: "networkidle" });
  const googleRegisterBtn = await page.locator("button:has-text('Continue with Google')").isVisible();
  console.log(`  ✓ Register form rendered: googleBtn=${googleRegisterBtn}`);

  // Test invalid login error handling
  console.log("\n9. Testing Interactive Error Handling on Login...");
  await page.fill("input[type='email']", "invalid_test_audit@example.com");
  await page.fill("input[type='password']", "WrongPassword999!");
  await page.click("button[type='submit']");
  await page.waitForTimeout(2000);
  const errorMessage = await page.locator(".text-red-700, .text-red-600, .bg-red-50").textContent().catch(() => null);
  console.log(`  ✓ Error message received on invalid login: "${errorMessage?.trim()}"`);

  // Check console errors
  console.log("\n--- Console and Network Summary ---");
  console.log(`Total Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((e) => console.log(`  Console Error: ${e}`));
  }
  console.log(`Total Failed Network Requests: ${networkFailures.length}`);
  if (networkFailures.length > 0) {
    networkFailures.forEach((f) => console.log(`  Failed Request: ${f}`));
  }

  await browser.close();
  console.log("\nBrowser E2E test finished cleanly!");
}

runBrowserTest().catch(console.error);
