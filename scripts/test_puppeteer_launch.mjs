import puppeteer from 'puppeteer-core';

async function testLaunch() {
  console.log('Testing Chrome launch via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--no-sandbox',
    ],
  });

  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/login');
  const title = await page.title();
  console.log('Page Title:', title);

  // Check getUserMedia with fake device
  const hasAudioTrack = await page.evaluate(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      return tracks.length > 0 && tracks[0].readyState === 'live';
    } catch (e) {
      return e.message;
    }
  });

  console.log('getUserMedia fake device audio track active:', hasAudioTrack);
  await browser.close();
  console.log('Chrome launch and getUserMedia verified successfully!');
}

testLaunch().catch((err) => {
  console.error('Launch test failed:', err);
  process.exit(1);
});
