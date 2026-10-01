const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });
  await page.goto('https://yuzen9622.github.io/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'yuzen_screenshot.png', fullPage: true });
  await browser.close();
  console.log('Screenshot saved to yuzen_screenshot.png');
})();
