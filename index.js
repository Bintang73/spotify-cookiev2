const puppeteer = require('puppeteer-extra');
const axios = require('axios');
const chalk = require('chalk');
const config = require('./config');
const userAgents = require('user-agents');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
var rnd = require("node-random-name");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const userAgentsList = Array.from({ length: 10 }, () => new userAgents());
puppeteer.use(StealthPlugin());
async function createSpotifyAccount() {
  // const response = await axios.get('https://randomuser.me/api/?nat=us');
  console.log('[Server] Fetching Random User api');
  // const userData = response.data.results[0];
  // const username = userData.name.last;
  var firstName = {
    'first': true
  };
  var name2 = rnd(firstName);
  var lastName = {
    'last': true
  };
  var name = rnd(lastName);
  const username = name2 + name;
  console.log('[Server] Name Found ' + username);
  const arrays = [
    'in', 'id', 'jp', 'kr', 'hk', 'ph', 'sg',
    'vn', 'mm', 'th', 'my', 'tw', 'bd', 'np', 'pk',
    'lk', 'kw', 'om', 'qa', 'sa', 'ae', 'ye', 'iq',
    'il', 'lb', 'sy', 'az', 'ir', 'tr', 'kz', 'uz',
    'kh', 'gb', 'fr', 'ru', 'it', 'se', 'de', 'be',
    'at', 'es', 'ie', 'fi', 'pt', 'lv', 'pl', 'lt',
    'hu', 'nl', 'ch', 'cz', 'no', 'is', 'gr', 'ua',
    'hr', 'mk', 'us', 'ca', 'cu', 'jm', 'mx', 'pa',
    'br', 'ar', 'co', 'cl', 've', 'pe', 'nz', 'au',
    'za', 'et', 'ke', 'gh', 'ng', 'dz'
  ]
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--user-agent=${userAgentsList[Math.floor(Math.random() * userAgentsList.length)].toString()}`,
      //`--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36`,
      '--disable-web-security',
      // `--proxy-server=${proxyServer}`,
      '--disable-features=IsolateOrigins,site-per-process'/*,
        `--load-extension=${path.resolve(__dirname, 'captcha')}`*/ // Replace with the actual path to your CRX file
    ],
  });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en'
  });
  await page.setViewport({ width: 1080, height: 1024 });
  const userAgent = await page.evaluate(() => {
    return navigator.userAgent;
  });

  console.log(chalk.green(userAgent));
  const enterEmailAndSubmit = async (email) => {
    console.log(chalk.blue('[Server] ') + 'Email: ' + email);
    await page.type('input#username', email);
    await page.waitForTimeout(2000);
    await page.click('button[data-testid="submit"]');
  };

  console.log('[Server] Opening Browser...');
  await page.goto('https://www.spotify.com/id-id/signup', { waitUntil: 'domcontentloaded' });
  console.log('[Server] Visiting Spotify Signup');

  await page.waitForSelector('input#username');
  let email;
  if (config.is_using_number_on_email) {
    const randomNumbers = Math.floor(Math.random() * 100);
    const formattedNumbers = String(randomNumbers).padStart(2, '0');
    email = username + formattedNumbers + '@' + config.domain;
  } else {
    email = username + '@' + config.domain;
  }
  enterEmailAndSubmit(email);
  const errorElement = await page.$('.Text-sc-g5kv67-0.hfclbh');
  if (errorElement) {
    console.log('Error found. Deleting and retrying email.');
    await page.evaluate(() => {
      document.querySelector('input#username').value = '';
    });
    enterEmailAndSubmit(email);
  }

  await page.waitForSelector('input#new-password');
  console.log(chalk.blue('[Server] ') + 'Password: ' + config.password);
  await page.type('input#new-password', config.password);
  await page.waitForTimeout(2000);
  await page.click('button[data-testid="submit"]');
  await page.waitForSelector('input#displayName');
  await page.type('input#displayName', username);
  await page.waitForSelector('input#day');
  console.log(chalk.blue('[Server] ') + 'Adding Day 1');
  await page.type('input#day', '1');
  await page.select('#month', '1')
  console.log(chalk.blue('[Server] ') + 'Adding month 1');
  await page.waitForSelector('input#year');
  console.log(chalk.blue('[Server] ') + 'Adding year 2000');
  await page.type('input#year', '2000');
  await page.click('input#gender_option_prefer_not_to_say');
  console.log(chalk.blue('[Server] ') + 'Gender: prefer not say');
  await page.waitForTimeout(2000);
  await page.click('button[data-testid="submit"]');
  console.log(chalk.blue('[Server] ') + 'Submiting Identity...');
  await page.waitForTimeout(2000);
  await page.click('button[data-testid="submit"]');
  console.log(chalk.blue('[Server] ') + 'Submiting tos...');
  console.log(chalk.red('[Server] ') + 'Security Checking Please wait a sec...');
  await page.waitForTimeout(7000);
  if (page.url().includes('challenge.spotify.com')) {
    console.log(chalk.yellow('[Server] ') + 'CAPTCHA challenge detected, try restarting your ip address');
    browser.close()
  } else {
    const currentDate = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const locale = 'id-ID';
    const date = currentDate.toLocaleDateString(locale, options);
    const ipaddress = await getUserIpAddress();
    const region = await getLocationInfo(ipaddress);
    console.log(chalk.green('[Server] ') + 'No CAPTCHA challenge detected. Saving credentials...');
    // Capture the response object
    const cookies = await page.cookies();
    const spDcCookie = cookies.find(cookie => cookie.name === 'sp_dc');

    if (spDcCookie) {
      const spDcValue = spDcCookie.value;
      const resultContent = `\n${email}|${config.password}|${spDcValue}`;
      fs.appendFileSync('result.txt', resultContent);
      const message = `(+) New Account Spotify Created\nRegion: ${region}\n\nEmail: \`\`${email}\`\`\nPassword: \`\`${config.password}\`\`\n\nCreated in ${date}`;
      console.log(chalk.green('[Server] ') + message);
    } else {
      console.log(chalk.green('[Server] ') + "SP_DC Cookie not found :/");
    }
    console.log(chalk.blue('[Server] ') + chalk.green('All done. The result is saving in result.txt'));
    await browser.close();
    console.log(chalk.blue('[Server] ') + 'Browser closed.');
  }
}
async function getUserIpAddress() {
  try {
    const response = await axios.get('https://api.ipify.org');
    return response.data.trim();
  } catch (error) {
    console.error('Error retrieving IP address:', error);
    return 'Unknown';
  }
}

async function askUserCount() {
  const ipaddress = await getUserIpAddress();
  const location = await getLocationInfo(ipaddress);
  const text = `
  ░█▀▀▀█ █▀▀█ █▀▀█ ▀▀█▀▀ ─▀─ █▀▀ █──█ 　 ░█▀▀█ █▀▀█ ▀▀█▀▀ 　 ─█▀▀█ █▀▀ █▀▀ █▀▀█ █──█ █▀▀▄ ▀▀█▀▀ 
  ─▀▀▀▄▄ █──█ █──█ ──█── ▀█▀ █▀▀ █▄▄█ 　 ░█▀▀▄ █──█ ──█── 　 ░█▄▄█ █── █── █──█ █──█ █──█ ──█── 
  ░█▄▄▄█ █▀▀▀ ▀▀▀▀ ──▀── ▀▀▀ ▀── ▄▄▄█ 　 ░█▄▄█ ▀▀▀▀ ──▀── 　 ░█─░█ ▀▀▀ ▀▀▀ ▀▀▀▀ ─▀▀▀ ▀──▀ ──▀── 
  `;
  console.log(chalk.red(text));
  console.log('Auto Create Shopee Account + Grab Cookie\n')
  console.log(chalk.blue("(-) IP ADDRESS: ") + chalk.yellow(ipaddress))
  console.log(chalk.green("(-) Location: ") + chalk.yellow(location))
  console.log(chalk.cyan('Please use vpn for all region account want to create\nThis script is beta featured'))
  rl.question(chalk.yellow('\nPress Ctrl+c to exit\n===================\n(+) ') + 'How many Spotify accounts do you want to create?\n- ', async (count) => {
    count = parseInt(count);
    if (isNaN(count) || count < 1) {
      console.log('Please Enter Number Only!');
      askUserCount();
    } else {
      puppeteer.use(StealthPlugin());
      for (let i = 0; i < count; i++) {
        try {
          console.log(chalk.green(`(+) Creating Spotify Account ${i + 1}`));
          await createSpotifyAccount();
          console.log(chalk.green(`(+) Succsesfully Creating Spotify Account ${i + 1}`));
        } catch (e) {
          console.log(e)
          console.log(chalk.red('[Server] ') + 'Network estabillished.');
        }
      }
      askUserCount();
    }
  });
}
async function getLocationInfo(ipAddress) {
  const apiUrl = `https://ipapi.co/${ipAddress}/json/`;
  try {
    const response = await axios.get(apiUrl);
    return response.data.country_name;
  } catch (error) {
    console.error('Error retrieving location information:', error);
    return 'oof';
  }
}
askUserCount();