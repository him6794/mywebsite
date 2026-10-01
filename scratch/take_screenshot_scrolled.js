const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });
  await page.goto('https://yuzen9622.github.io/', { waitUntil: 'networkidle0' });
  
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      let distance = 100;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'yuzen_screenshot_scrolled.png', fullPage: true });
  await browser.close();
  console.log('Screenshot saved to yuzen_screenshot_scrolled.png');
})();
