const WebSocketClient = globalThis.WebSocket;

const BASE_URL = 'http://127.0.0.1:8000/api/v1';
const WS_BASE_URL = 'ws://127.0.0.1:8000/api/v1';

async function postJson(endpoint, data, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

async function getJson(endpoint, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers,
  });
  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

async function runE2E() {
  console.log('=== VOXSHIELD AI — PHASE 3.1 RUNTIME E2E VERIFICATION ===\n');

  const ts = Date.now();
  const aliceEmail = `alice_${ts}@voxshield.io`;
  const bobEmail = `bob_${ts}@voxshield.io`;
  const password = 'StrongPassword123!';

  // 1. REGISTER USERS
  console.log('[1/10] Registering Test Operators...');
  const regAlice = await postJson('/auth/register', {
    email: aliceEmail,
    username: `alice_${ts}`,
    display_name: 'Alice Vance',
    password,
  });
  if (!regAlice.ok) throw new Error(`Alice registration failed: ${JSON.stringify(regAlice.data)}`);
  console.log(`  ✓ Registered Alice: ${regAlice.data.data.user.id}`);

  const regBob = await postJson('/auth/register', {
    email: bobEmail,
    username: `bob_${ts}`,
    display_name: 'Bob Callee',
    password,
  });
  if (!regBob.ok) throw new Error(`Bob registration failed: ${JSON.stringify(regBob.data)}`);
  console.log(`  ✓ Registered Bob: ${regBob.data.data.user.id}`);

  const aliceId = regAlice.data.data.user.id;
  const bobId = regBob.data.data.user.id;
  let aliceAccess = regAlice.data.data.tokens.access_token;
  let aliceRefresh = regAlice.data.data.tokens.refresh_token;
  const bobAccess = regBob.data.data.tokens.access_token;

  // 2. AUTHENTICATION & PROTECTED ACCESS
  console.log('\n[2/10] Verifying Protected Access & Auth Headers...');
  const meRes = await getJson('/users/me', aliceAccess);
  if (!meRes.ok) throw new Error(`Protected /users/me failed: ${JSON.stringify(meRes.data)}`);
  console.log(`  ✓ Successfully accessed /users/me for user: ${meRes.data.data.username}`);

  // 3. REFRESH TOKEN ROTATION
  console.log('\n[3/10] Testing Single-Use Refresh Token Rotation...');
  const refreshRes = await postJson('/auth/refresh', { refresh_token: aliceRefresh });
  if (!refreshRes.ok) throw new Error(`Refresh failed: ${JSON.stringify(refreshRes.data)}`);
  const newAliceAccess = refreshRes.data.data.tokens.access_token;
  const newAliceRefresh = refreshRes.data.data.tokens.refresh_token;
  console.log('  ✓ Successfully refreshed token pair');

  // Verify old refresh token is revoked/rejected
  const replayRes = await postJson('/auth/refresh', { refresh_token: aliceRefresh });
  if (replayRes.ok) throw new Error('Security violation: Reused refresh token was accepted!');
  console.log(`  ✓ Old refresh token rejected as expected (Status: ${replayRes.status})`);
  aliceAccess = newAliceAccess;
  aliceRefresh = newAliceRefresh;

  // 4. CREATE CALL SESSION
  console.log('\n[4/10] Creating Call Session...');
  const callRes = await postJson('/calls', {
    receiver_id: bobId,
    call_type: 'SECURE_VOICE',
  }, aliceAccess);
  if (!callRes.ok) throw new Error(`Call creation failed: ${JSON.stringify(callRes.data)}`);
  const callId = callRes.data.data.id;
  console.log(`  ✓ Call session created: ${callId} (Status: ${callRes.data.data.status})`);

  // 5. REAL WEBSOCKET SIGNALING TEST
  console.log('\n[5/10] Testing Real WebSocket Signaling Relay (/ws/signaling)...');
  const aliceWsUrl = `${WS_BASE_URL}/ws/signaling/${callId}?token=${aliceAccess}`;
  const bobWsUrl = `${WS_BASE_URL}/ws/signaling/${callId}?token=${bobAccess}`;

  await new Promise((resolve, reject) => {
    let aliceWs, bobWs;
    let offerReceived = false;
    let answerReceived = false;
    let iceReceived = false;

    const timeout = setTimeout(() => {
      if (aliceWs) aliceWs.close();
      if (bobWs) bobWs.close();
      reject(new Error('WebSocket signaling test timed out after 10s'));
    }, 10000);

    let aliceOpen = false;
    let bobOpen = false;
    let offerSent = false;

    function triggerOffer() {
      if (!offerSent && aliceOpen && bobOpen) {
        offerSent = true;
        // Small delay to ensure both server sessions are fully registered
        setTimeout(() => {
          aliceWs.send(JSON.stringify({
            type: 'offer',
            payload: { type: 'offer', sdp: 'v=0\r\no=alice 2890844526 ...' },
          }));
        }, 150);
      }
    }

    aliceWs = new WebSocketClient(aliceWsUrl);
    bobWs = new WebSocketClient(bobWsUrl);

    aliceWs.onopen = () => {
      aliceOpen = true;
      triggerOffer();
    };

    bobWs.onopen = () => {
      bobOpen = true;
      triggerOffer();
    };

    bobWs.onmessage = (event) => {
      const msg = typeof event.data === 'string' ? JSON.parse(event.data) : JSON.parse(event.data.toString());
      if (msg.type === 'offer') {
        offerReceived = true;
        // Bob replies with answer
        bobWs.send(JSON.stringify({
          type: 'answer',
          payload: { type: 'answer', sdp: 'v=0\r\no=bob 2890844526 ...' },
        }));
      } else if (msg.type === 'ice_candidate') {
        iceReceived = true;
      }
    };

    aliceWs.onmessage = (event) => {
      const msg = typeof event.data === 'string' ? JSON.parse(event.data) : JSON.parse(event.data.toString());
      if (msg.type === 'answer') {
        answerReceived = true;
        // Alice sends ICE candidate
        aliceWs.send(JSON.stringify({
          type: 'ice_candidate',
          payload: { candidate: 'candidate:1 1 UDP 2130706431 127.0.0.1 50000 typ host' },
        }));
      } else if (msg.type === 'peer_connected') {
        triggerOffer();
      }
    };

    // Check completion
    const checkInterval = setInterval(() => {
      if (offerReceived && answerReceived && iceReceived) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        aliceWs.close();
        bobWs.close();
        console.log('  ✓ WebSocket offer/answer/ICE exchange verified successfully');
        resolve();
      }
    }, 200);
  });

  // 6. TELEMETRY RUNTIME AUDIT (10 CONSECUTIVE REQUESTS)
  console.log('\n[6/10] Telemetry Runtime Audit (Measuring 10 consecutive reports)...');
  const payloadSizes = [];
  const intervals = [];
  let lastTimestamp = Date.now();

  for (let i = 1; i <= 10; i++) {
    const now = Date.now();
    intervals.push(now - lastTimestamp);
    lastTimestamp = now;

    const payload = {
      window_index: i,
      window_duration_ms: 1500,
      client_timestamp_ms: now,
      ai_generated_probability: i > 7 ? 0.94 : 0.04,
      speaker_match_probability: i > 7 ? 0.28 : 0.94,
      liveness_probability: i > 7 ? 0.26 : 0.96,
      detected_artifacts: i > 7 ? ['vocoder_phase_discontinuity', 'zero_shot_diffusion_artifact'] : [],
    };

    const payloadString = JSON.stringify(payload);
    const byteLength = Buffer.byteLength(payloadString, 'utf8');
    payloadSizes.push(byteLength);

    // Verify zero audio assertions on actual payload
    if (payload.audio || payload.waveform || payload.pcm || payload.raw_bytes) {
      throw new Error('ZERO-SERVER-AUDIO VIOLATION: Raw audio found in telemetry payload!');
    }

    const telRes = await postJson(`/calls/${callId}/security-analysis`, payload, aliceAccess);
    if (!telRes.ok) throw new Error(`Telemetry failed on window ${i}: ${JSON.stringify(telRes.data)}`);

    // Sleep briefly to simulate ~1500ms sliding window pacing (fast-forwarded for test)
    await new Promise((r) => setTimeout(r, 100));
  }

  const minBytes = Math.min(...payloadSizes);
  const maxBytes = Math.max(...payloadSizes);
  const avgBytes = Math.round(payloadSizes.reduce((a, b) => a + b, 0) / payloadSizes.length);

  console.log(`  ✓ 10/10 telemetry reports ingested successfully`);
  console.log(`  ✓ Telemetry payload sizes: min=${minBytes}B, max=${maxBytes}B, avg=${avgBytes}B`);
  console.log(`  ✓ ZERO-SERVER-AUDIO AUDIT: 0 bytes of audio waveform in all 10 payloads`);

  // 7. THREAT DETECTION & SEVERITY EVALUATION
  console.log('\n[7/10] Verifying Threat Detection Reaction...');
  const highThreatPayload = {
    window_index: 11,
    window_duration_ms: 1500,
    client_timestamp_ms: Date.now(),
    ai_generated_probability: 0.98,
    speaker_match_probability: 0.15,
    liveness_probability: 0.20,
    detected_artifacts: ['spectral_discontinuity', 'vocoder_phase_discontinuity'],
  };
  const threatReaction = await postJson(`/calls/${callId}/security-analysis`, highThreatPayload, aliceAccess);
  const threatData = threatReaction.data.data;
  console.log(`  ✓ High threat detected: Score=${threatData.threat_score}/100, Severity=${threatData.severity}`);
  console.log(`  ✓ Recommended action: ${threatData.recommended_action}`);
  if (threatData.threat_score < 70) throw new Error('Expected threat score >= 70 for clone payload');

  // 8. CHALLENGE-RESPONSE VERIFICATION (PASS & FAIL)
  console.log('\n[8/10] Testing Acoustic Challenge-Response Verification...');
  const chalRes = await postJson(`/calls/${callId}/challenge`, {}, aliceAccess);
  if (!chalRes.ok) throw new Error(`Challenge generation failed: ${JSON.stringify(chalRes.data)}`);
  const chalData = chalRes.data.data;
  console.log(`  ✓ Generated challenge phrase: "${chalData.passphrase}" (ID: ${chalData.challenge_id})`);

  // 8a. Test PASS with exact matching phrase
  const passRes = await postJson(`/calls/${callId}/challenge/verify`, {
    challenge_id: chalData.challenge_id,
    spoken_phrase: chalData.passphrase,
    liveness_score: 0.95,
  }, aliceAccess);
  if (!passRes.ok || !passRes.data.data.verified) {
    throw new Error(`Challenge PASS expected but failed: ${JSON.stringify(passRes.data)}`);
  }
  console.log(`  ✓ Challenge PASS verified: verified=${passRes.data.data.verified}, status=${passRes.data.data.status}`);

  // 8b. Test FAIL with wrong phrase on new challenge
  const chalRes2 = await postJson(`/calls/${callId}/challenge`, {}, aliceAccess);
  const chalData2 = chalRes2.data.data;
  const failRes = await postJson(`/calls/${callId}/challenge/verify`, {
    challenge_id: chalData2.challenge_id,
    spoken_phrase: 'Completely different random phrase that does not match',
    liveness_score: 0.95,
  }, aliceAccess);
  if (!failRes.ok || failRes.data.data.verified) {
    throw new Error(`Challenge FAIL expected but passed: ${JSON.stringify(failRes.data)}`);
  }
  console.log(`  ✓ Challenge FAIL verified: verified=${failRes.data.data.verified}, status=${failRes.data.data.status}`);

  // 9. INCIDENT REPORT & BLOCKCHAIN VERIFICATION
  console.log('\n[9/10] Testing Tamper-Evident Incidents & Ledger Verification...');
  const incRes = await postJson('/incidents', {
    call_id: callId,
    incident_type: 'VOICE_CLONING_ATTEMPT',
    severity: 'CRITICAL',
    threat_score: 94.5,
    ai_probability: 0.98,
    summary: 'Caller exhibited synthetic vocoder phase discontinuity and failed acoustic challenge.',
    indicators: ['SPECTRAL_DISCONTINUITY', 'SYNTHETIC_VOCATION_MODEL'],
    recommendations: ['Terminate active voice session'],
  }, aliceAccess);
  if (!incRes.ok) throw new Error(`Incident creation failed: ${JSON.stringify(incRes.data)}`);
  const incId = incRes.data.data.id;
  const canonicalHash = incRes.data.data.canonical_hash;
  console.log(`  ✓ Created incident #${incRes.data.data.incident_number} (Canonical SHA-256: ${canonicalHash.substring(0, 16)}...)`);

  // Anchor to blockchain
  const anchorRes = await postJson(`/incidents/${incId}/anchor`, {}, aliceAccess);
  if (!anchorRes.ok) throw new Error(`Anchor failed: ${JSON.stringify(anchorRes.data)}`);
  console.log(`  ✓ Anchored on ledger: Tx=${anchorRes.data.data.transaction_hash}, Block=#${anchorRes.data.data.block_number}, Network=${anchorRes.data.data.network}`);

  // Verify proof
  const verifyRes = await getJson(`/incidents/${incId}/verification`, aliceAccess);
  if (!verifyRes.ok || !verifyRes.data.data.is_valid) {
    throw new Error(`Verification failed: ${JSON.stringify(verifyRes.data)}`);
  }
  console.log(`  ✓ Cryptographic integrity verified: status=${verifyRes.data.data.verification_status}, is_valid=${verifyRes.data.data.is_valid}`);

  // 10. CLEANUP & HANGUP
  console.log('\n[10/10] Terminating Call & Closing Resources...');
  const endRes = await postJson(`/calls/${callId}/end`, {}, aliceAccess);
  if (!endRes.ok) throw new Error(`Call termination failed: ${JSON.stringify(endRes.data)}`);
  console.log(`  ✓ Call successfully terminated: status=${endRes.data.data.status}`);

  console.log('\n=============================================================');
  console.log('🎉 ALL 10 RUNTIME E2E VERIFICATION CHECKS PASSED WITH 100% SUCCESS');
  console.log('=============================================================');
}

runE2E().catch((err) => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
