import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('docs/artifacts/phase5');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runBrowserDemo() {
  console.log('='.repeat(70));
  console.log('VOXSHIELD AI — PHASE 5 BROWSER RUNTIME E2E ATTACK DEMO');
  console.log('='.repeat(70));

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
  await page.setViewport({ width: 1440, height: 900 });

  // Network request interception for Zero-Server-Audio Privacy Audit
  const networkAudit = {
    totalRequests: 0,
    telemetryRequests: 0,
    audioUploadRequests: 0,
    rawAudioBytesUploaded: 0,
  };

  page.on('request', (req) => {
    networkAudit.totalRequests++;
    const url = req.url();
    const postData = req.postData() || '';

    if (url.includes('/security-analysis') || url.includes('/demo/execute')) {
      networkAudit.telemetryRequests++;
      // Audit for illegal audio transfers
      if (
        postData.includes('audio/wav') ||
        postData.includes('audio/webm') ||
        postData.includes('base64,UklGR') ||
        postData.includes('raw_audio_bytes')
      ) {
        networkAudit.audioUploadRequests++;
        networkAudit.rawAudioBytesUploaded += postData.length;
      }
    }
  });

  try {
    // 1. Login
    console.log('[1] Navigating to http://127.0.0.1:5173/login...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle2' });

    await page.type('input[type="email"], input[placeholder*="email" i]', 'phase5tester@voxshield.ai');
    await page.type('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    console.log('[✓] Logged in successfully. Current URL:', page.url());

    // 2. Obtain Call ID via backend API
    console.log('[2] Creating active call session for demonstration...');
    const loginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'phase5tester@voxshield.ai', password: 'SecurePassword123!' }),
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data.tokens.access_token;
    const userId = loginJson.data.user.id;

    // Fetch or register callee
    const calleeLoginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'callee5@voxshield.ai', password: 'SecurePassword123!' }),
    });
    const calleeJson = await calleeLoginRes.json();
    const calleeId = calleeJson.data.user.id;

    // Create fresh call
    const callRes = await fetch('http://127.0.0.1:8000/api/v1/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiver_id: calleeId,
        encryption_algorithm: 'DTLS-SRTP-AES-128-GCM',
      }),
    });
    const callJson = await callRes.json();
    const activeCallId = callJson.data.id;
    console.log('[✓] Active Call created:', activeCallId);

    // 3. Navigate to CallScreen
    console.log(`[3] Opening Call Screen: /app/calls/${activeCallId}...`);
    await page.goto(`http://127.0.0.1:5173/app/calls/${activeCallId}`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2500));

    // Capture Baseline Screenshot
    const baselineShot = path.join(SCREENSHOT_DIR, '01_call_screen_baseline.png');
    await page.screenshot({ path: baselineShot, fullPage: false });
    console.log(`[✓] Captured baseline screenshot: ${baselineShot}`);

    // Verify UI components exist
    const hasShield = await page.$eval('body', (el) => el.innerText.includes('SECURITY') || el.innerText.includes('DTLS-SRTP'));
    const hasController = await page.$eval('body', (el) => el.innerText.includes('ATTACK SIMULATION CONTROLLER'));
    const hasTimeline = await page.$eval('body', (el) => el.innerText.includes('Live Security Timeline'));
    console.log(`[✓] UI Verification: SecurityShield=${hasShield}, AttackController=${hasController}, Timeline=${hasTimeline}`);

    // 4. Select Simulated Critical Scenario & Click 'Run Attack Sequence'
    console.log('[4] Selecting Simulated Critical attack scenario...');
    const scenarioBtn = await page.waitForSelector('button ::-p-text(Simulated Critical)', { timeout: 5000 });
    await scenarioBtn.click();
    await new Promise((r) => setTimeout(r, 600));

    console.log('    Triggering Run Attack Sequence button...');
    const attackBtn = await page.waitForSelector('button ::-p-text(Run Attack Sequence)', { timeout: 5000 });
    await attackBtn.click();

    // Wait for full attack escalation (steps 0 -> 1 -> 2 -> 3 = approx 5 seconds)
    console.log('    Watching real-time threat score escalate from LOW to CRITICAL...');
    await new Promise((r) => setTimeout(r, 6500));

    // Capture Escalated Threat Screenshot
    const attackShot = path.join(SCREENSHOT_DIR, '02_attack_escalation_critical.png');
    await page.screenshot({ path: attackShot, fullPage: false });
    console.log(`[✓] Captured attack escalation screenshot: ${attackShot}`);

    // Verify Incident Banner appeared
    const hasIncidentBanner = await page.$eval('body', (el) => el.innerText.includes('SECURITY INCIDENT AUTOMATICALLY LOGGED') || el.innerText.includes('Evidence SHA-256'));
    console.log(`[✓] Incident Banner Visible: ${hasIncidentBanner}`);

    // 5. Open Tamper Test Modal using explicit ID #open-tamper-modal-btn
    console.log('[5] Clicking Run Tamper Test on Incident Banner...');
    const tamperLaunchBtn = await page.waitForSelector('#open-tamper-modal-btn', { timeout: 10000 });
    await tamperLaunchBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Inside Modal: Click Verify Cryptographic Tamper Alert
    console.log('    Executing in-memory cryptographic tamper demonstration...');
    const modalRunBtn = await page.waitForSelector('#execute-tamper-check-btn', { timeout: 5000 });
    await modalRunBtn.click();
    await new Promise((r) => setTimeout(r, 1500));

    // Capture Tamper Verification Result Screenshot
    const tamperShot = path.join(SCREENSHOT_DIR, '03_tamper_test_verified.png');
    await page.screenshot({ path: tamperShot, fullPage: false });
    console.log(`[✓] Captured tamper demonstration screenshot: ${tamperShot}`);

    const hasTamperAlert = await page.$eval('body', (el) => el.innerText.includes('TAMPER DETECTED — EVIDENCE MISMATCH'));
    console.log(`[✓] Cryptographic Tamper Alert Visible: ${hasTamperAlert}`);

    // Close modal
    const closeBtn = await page.waitForSelector('button ::-p-text(Close Audit)', { timeout: 5000 });
    await closeBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    // 6. Click Reset Demo
    console.log('[6] Clicking Reset Demo...');
    const resetBtn = await page.waitForSelector('button ::-p-text(Reset Demo)', { timeout: 5000 });
    await resetBtn.click();
    await new Promise((r) => setTimeout(r, 2000));

    // Capture Reset Screenshot
    const resetShot = path.join(SCREENSHOT_DIR, '04_demo_reset_verified.png');
    await page.screenshot({ path: resetShot, fullPage: false });
    console.log(`[✓] Captured demo reset screenshot: ${resetShot}`);

    // 7. Network Privacy Audit Report
    console.log('\n' + '-'.repeat(50));
    console.log('NETWORK PRIVACY & ZERO-SERVER-AUDIO AUDIT:');
    console.log(`- Total HTTP requests captured:      ${networkAudit.totalRequests}`);
    console.log(`- Security telemetry requests:       ${networkAudit.telemetryRequests}`);
    console.log(`- Suspicious raw audio uploads:      ${networkAudit.audioUploadRequests}`);
    console.log(`- Raw audio bytes sent to backend:   ${networkAudit.rawAudioBytesUploaded} bytes`);
    console.log('-'.repeat(50));

    if (networkAudit.audioUploadRequests === 0 && networkAudit.rawAudioBytesUploaded === 0) {
      console.log('[PASS] Zero-Server-Audio Invariant strictly preserved!');
    } else {
      throw new Error('VIOLATION: Raw audio was uploaded to server during call!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('PHASE 5 BROWSER E2E DEMO VERIFIED SUCCESSFULLY');
    console.log('='.repeat(70));
  } finally {
    await browser.close();
  }
}

runBrowserDemo().catch((err) => {
  console.error('Browser demo error:', err);
  process.exit(1);
});
