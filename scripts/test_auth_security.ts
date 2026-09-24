import { store } from '../src/db/store.js';
import crypto from 'crypto';

async function runAuthSecurityTests() {
  console.log("==================================================");
  console.log("AURA AUTH & JWT SECURITY REGRESSION TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  // Helper to generate self-signed RSA key pair for testing signature mismatch
  const { privateKey: testPrivKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const validProjectId = 'ai-studio-aura-0580ece6-7701-4148-bdcf-9accc85a9917';
  const validIssuer = `https://securetoken.google.com/${validProjectId}`;

  function createSignedToken(header: any, payload: any, privKey: string): string {
    const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${encHeader}.${encPayload}`);
    const sig = signer.sign(privKey, 'base64url');
    return `${encHeader}.${encPayload}.${sig}`;
  }

  // TEST 1: Odrzucanie JWT z nieznanym kid / brakiem certyfikatu (Niedostępność certyfikatów nie może oznaczać akceptacji tokenu)
  console.log("\n[TEST 1] JWT z nieznanym certyfikatem / niedostępnością certyfikatu...");
  const tokenUnknownCert = createSignedToken(
    { alg: 'RS256', kid: 'non_existent_key_id_9999' },
    {
      aud: validProjectId,
      iss: validIssuer,
      sub: 'test_user_unknown_kid',
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    testPrivKey
  );

  const res1 = await store.getUserByToken(tokenUnknownCert);
  if (res1 === null) {
    console.log("  -> PASS: Token z nieistniejącym certyfikatem został natychmiast odrzucony (zwrócono null).");
    passed++;
  } else {
    console.error("  -> FAIL: Token został zaakceptowany mimo braku certyfikatu!", res1);
    failed++;
  }

  // TEST 2: Odrzucanie JWT z sfałszowanym / złym podpisem
  console.log("\n[TEST 2] JWT ze sfałszowanym podpisem...");
  const forgedToken = `${Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'fake_kid' })).toString('base64url')}.${Buffer.from(
    JSON.stringify({
      aud: validProjectId,
      iss: validIssuer,
      sub: 'test_attacker',
      exp: Math.floor(Date.now() / 1000) + 3600
    })
  ).toString('base64url')}.invalid_forged_signature_bytes`;

  const res2 = await store.getUserByToken(forgedToken);
  if (res2 === null) {
    console.log("  -> PASS: Token ze sfałszowanym podpisem został natychmiast odrzucony.");
    passed++;
  } else {
    console.error("  -> FAIL: Token ze sfałszowanym podpisem został zaakceptowany!", res2);
    failed++;
  }

  // TEST 3: Odrzucanie JWT ze złym Issuerem lub Audience
  console.log("\n[TEST 3] JWT z nieprawidłowym issuerem i audience...");
  const invalidAudToken = createSignedToken(
    { alg: 'RS256', kid: 'test_kid' },
    {
      aud: 'attacker-malicious-app-id',
      iss: 'https://malicious-issuer.com',
      sub: 'test_user_bad_aud',
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    testPrivKey
  );

  const res3 = await store.getUserByToken(invalidAudToken);
  if (res3 === null) {
    console.log("  -> PASS: Token z nieprawidłowym audience/issuer został natychmiast odrzucony.");
    passed++;
  } else {
    console.error("  -> FAIL: Token z błędnym aud/iss został zaakceptowany!", res3);
    failed++;
  }

  // TEST 4: Odrzucanie JWT z wygasłym exp
  console.log("\n[TEST 4] JWT z wygasłym znacznikiem exp...");
  const expiredToken = createSignedToken(
    { alg: 'RS256', kid: 'test_kid' },
    {
      aud: validProjectId,
      iss: validIssuer,
      sub: 'test_user_expired',
      exp: Math.floor(Date.now() / 1000) - 3600
    },
    testPrivKey
  );

  const res4 = await store.getUserByToken(expiredToken);
  if (res4 === null) {
    console.log("  -> PASS: Wygasły token JWT został natychmiast odrzucony.");
    passed++;
  } else {
    console.error("  -> FAIL: Wygasły token JWT został zaakceptowany!", res4);
    failed++;
  }

  // TEST 5: Próba logowania hasłem do konta bez hasła (federated OAuth)
  console.log("\n[TEST 5] Blokada logowania hasłem do konta bez hasła...");
  try {
    const regEmail = `oauth_only_${Date.now()}@aura.local`;
    await store.registerUser(regEmail, 'OAuth User', 25, 'USER');
    
    let loginErrorThrown = false;
    let errorMessage = '';
    try {
      await store.loginUser(regEmail, 'attempted_password_123');
    } catch (e: any) {
      loginErrorThrown = true;
      errorMessage = e.message;
    }

    if (loginErrorThrown && errorMessage.includes('no password configured')) {
      console.log("  -> PASS: Próba logowania do konta bez hasła zablokowana:", errorMessage);
      passed++;
    } else {
      console.error("  -> FAIL: Logowanie hasłem do konta bezhasłowego nie rzuciło oczekiwanego błędu!", errorMessage);
      failed++;
    }
  } catch (err: any) {
    console.error("  -> FAIL w teście konta bezhasłowego:", err.message);
    failed++;
  }

  // TEST 6: Odrzucanie uszkodzonych hashy i weryfikacja timingSafeEqual
  console.log("\n[TEST 6] Odrzucanie uszkodzonych hashy haseł...");
  try {
    const corruptEmail = `corrupt_test_${Date.now()}@aura.local`;
    const regResult = await store.registerUser(corruptEmail, 'Corrupt Hash User', 25, 'USER', 'InitialPassword123!');
    
    (store as any).userPasswords.set(regResult.user.id, 'invalid_corrupted_hash_without_salt');

    let corruptErrorThrown = false;
    let errorMessage = '';
    try {
      await store.loginUser(corruptEmail, 'InitialPassword123!');
    } catch (e: any) {
      corruptErrorThrown = true;
      errorMessage = e.message;
    }

    if (corruptErrorThrown && errorMessage.includes('Corrupted password credentials format')) {
      console.log("  -> PASS: Uszkodzony hash został odrzucony:", errorMessage);
      passed++;
    } else {
      console.error("  -> FAIL: Uszkodzony hash nie został odrzucony poprawnie!", errorMessage);
      failed++;
    }
  } catch (err: any) {
    console.error("  -> FAIL w teście uszkodzonego hasha:", err.message);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`TOTAL PASSED: ${passed}, FAILED: ${failed}`);
  console.log("==================================================");

  process.exitCode = failed > 0 ? 1 : 0;
}

runAuthSecurityTests();
