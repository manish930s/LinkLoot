require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const { exec } = require('child_process');

const EMAIL = process.env.YT_EMAIL;
const PASSWORD = process.env.YT_PASSWORD;

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Go to YouTube login
  await page.goto('https://accounts.google.com/signin/v2/identifier?service=youtube', { waitUntil: 'networkidle2' });

  // Enter email
  await page.type('input[type="email"]', EMAIL, { delay: 50 });
  await page.click('#identifierNext');
  await page.waitForTimeout(2000);

  // Enter password
  await page.waitForSelector('input[type="password"]', { visible: true });
  await page.type('input[type="password"]', PASSWORD, { delay: 50 });
  await page.click('#passwordNext');
  await page.waitForTimeout(5000);

  // Go to YouTube to ensure cookies are set
  await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });

  // Save cookies in cookies.json
  const cookies = await page.cookies();
  fs.writeFileSync('youtube.com_cookies.json', JSON.stringify(cookies, null, 2));

  // Convert cookies to cookies.txt format for yt-dlp
  const cookiesTxt = cookies.map(c =>
    [
      c.domain.startsWith('.') ? 'TRUE' : 'FALSE',
      c.domain,
      'TRUE',
      c.path,
      c.secure ? 'TRUE' : 'FALSE',
      c.expiry || Math.floor(Date.now() / 1000) + 3600,
      c.name,
      c.value
    ].join('\t')
  ).join('\n');
  fs.writeFileSync('youtube.com_cookies.txt', cookiesTxt);
  console.log('Cookies exported to youtube.com_cookies.txt');

  await browser.close();
})();

exec('yt-dlp --cookies youtube.com_cookies.txt <other-args>', (err, stdout, stderr) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Output:', stdout);
});