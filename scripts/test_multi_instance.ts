import { getPostgresPool, initPostgresSchema, PostgresStoreAdapter } from '../src/db/postgres.js';
import crypto from 'crypto';

async function runMultiInstanceTest() {
  console.log("==================================================");
  console.log("AURA DATABASE MULTI-INSTANCE CONSISTENCY VERIFICATION");
  console.log("==================================================");

  const pool = getPostgresPool();
  if (!pool) {
    console.log("[UNVERIFIED] Brak skonfigurowanego środowiska PostgreSQL (DATABASE_URL / SQL_HOST).");
    console.log("[UNVERIFIED] Test odczytu między instancjami oznaczony jako NIEZWERYFIKOWANY (brak środowiska testowego).");
    // Wymóg 8: Brak dostępu do prawdziwego PostgreSQL oznacz UNVERIFIED; test nie może wtedy zakończyć się kodem 0.
    process.exit(2);
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
  } catch (err: any) {
    console.log(`[UNVERIFIED] Nie można nawiązać połączenia z bazą danych: ${err.message}`);
    console.log("[UNVERIFIED] Test wielu instancji oznaczony jako NIEZWERYFIKOWANY (brak aktywnego połączenia z bazą).");
    if (client) client.release();
    // Wymóg 8: Brak dostępu do prawdziwego PostgreSQL oznacz UNVERIFIED; test nie może wtedy zakończyć się kodem 0.
    process.exit(2);
  } finally {
    if (client) client.release();
  }

  try {
    const schemaReady = await initPostgresSchema();
    if (!schemaReady) {
      console.error("[FAIL] Inicjalizacja schematu PostgreSQL nie powiodła się.");
      process.exit(1);
    }

    console.log("[1/6] Inicjalizacja dwóch niezależnych instancji adaptera pamięci...");
    const instanceA = new PostgresStoreAdapter(pool);
    const instanceB = new PostgresStoreAdapter(pool);

    const testIdA = crypto.randomUUID();
    const testIdB = crypto.randomUUID();
    const testEmail = `multi_instance_test_${Date.now()}@aura.local`;
    const testToken = `aura_sess_multi_${testIdA}_${crypto.randomBytes(16).toString('hex')}`;
    const testUser = {
      id: testIdA,
      email: testEmail,
      role: 'USER' as const,
      status: 'ACTIVE' as const,
      isAgeVerified18Plus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: {
        id: `prof-${testIdA}`,
        userId: testIdA,
        displayName: 'Multi Instance Test',
        age: 27,
        identityRole: 'Versatile',
        location: 'Warsaw, PL',
        distanceKm: 2.1,
        locationPrivacy: 'APPROXIMATE' as const,
        approximateArea: 'Śródmieście (~1 km)',
        bio: 'Automated cross-instance verification.',
        lookingFor: ['Dating'],
        tribes: ['Clean Cut'],
        interests: ['Tech'],
        photos: [{ id: `ph-${testIdA}`, url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', isPrimary: true }],
        verified: true,
        isOnline: true,
        lastActiveMinutesAgo: 0
      }
    };

    console.log("[2/6] Zapis użytkownika i sesji przez Instancję A...");
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    await instanceA.saveUserAndSession(testUser, testToken, expiresAt);

    const fetchedByToken = await instanceB.getUserByToken(testToken);
    if (!fetchedByToken || fetchedByToken.id !== testIdA) {
      console.error("[FAIL] Instancja B nie odczytała użytkownika po tokenie sesji!");
      process.exit(1);
    }

    // 1. Wiadomość & konwersacja z participantIds w transakcji
    console.log("[3/6] Test wiadomości i konwersacji z participantIds (Instancja A -> Instancja B)...");
    const testConvId = crypto.randomUUID();
    const testMsgId = crypto.randomUUID();
    const testMsg = {
      id: testMsgId,
      conversationId: testConvId,
      senderId: testIdA,
      receiverId: testIdB,
      text: 'Cross-instance verification message',
      type: 'TEXT' as const,
      status: 'SENT' as const,
      createdAt: new Date().toISOString()
    };
    const testConv = {
      id: testConvId,
      participantIds: [testIdA, testIdB],
      unreadCount: 1,
      lastMessage: testMsg,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await instanceA.saveMessageAndConversationTransaction(testMsg, testConv);

    const convsB = await instanceB.loadAllConversations();
    const foundConv = convsB.find(c => c.id === testConvId);
    if (!foundConv || !foundConv.participantIds.includes(testIdA) || !foundConv.participantIds.includes(testIdB)) {
      console.error("[FAIL] Instancja B nie odnalazła konwersacji lub brakuje participantIds!");
      process.exit(1);
    }

    const msgsB = await instanceB.loadAllMessages();
    const foundMsg = msgsB.find(m => m.id === testMsgId);
    if (!foundMsg || foundMsg.text !== 'Cross-instance verification message') {
      console.error("[FAIL] Instancja B nie odczytała wiadomości zapisanej przez Instancję A!");
      process.exit(1);
    }
    console.log("  -> Wiadomość i participantIds zweryfikowane pomyślnie w Instancji B.");

    // 2. Blokada użytkownika
    console.log("[4/6] Test blokady użytkownika (Instancja A -> Instancja B)...");
    const blockId = crypto.randomUUID();
    await instanceA.saveBlock({
      id: blockId,
      blockerUserId: testIdA,
      blockedUserId: testIdB,
      createdAt: new Date().toISOString()
    });

    const blocksB = await instanceB.loadAllBlocks();
    const foundBlock = blocksB.find(b => b.blockerUserId === testIdA && b.blockedUserId === testIdB);
    if (!foundBlock) {
      console.error("[FAIL] Instancja B nie widzi blokady nałożonej przez Instancję A!");
      process.exit(1);
    }
    console.log("  -> Blokada użytkownika widoczna w Instancji B bez restartu.");

    // 3. Zmiana statusu konta
    console.log("[5/6] Test zmiany statusu konta (Instancja A -> Instancja B)...");
    const suspendedUser = {
      ...testUser,
      status: 'SUSPENDED' as const,
      updatedAt: new Date().toISOString()
    };
    await instanceA.saveUser(suspendedUser);

    const userB = await instanceB.getUserById(testIdA);
    if (!userB || userB.status !== 'SUSPENDED') {
      console.error("[FAIL] Instancja B nie widzi zmiany statusu konta na SUSPENDED!");
      process.exit(1);
    }
    console.log("  -> Zmiana statusu konta na SUSPENDED natychmiast widoczna w Instancji B bez restartu.");

    // 4. Wylogowanie (unieważnienie sesji)
    console.log("[6/6] Test wylogowania / unieważnienia sesji oraz test awarii i ponowienia...");
    await instanceA.deleteSession(testToken);
    const sessionAfterLogout = await instanceB.getUserByToken(testToken);
    if (sessionAfterLogout) {
      console.error("[FAIL] Sesja po wylogowaniu w Instancji A nadal jest aktywna w Instancji B!");
      process.exit(1);
    }
    console.log("  -> Wylogowanie w Instancji A natychmiast unieważniło sesję w Instancji B.");

    // 5. Test awarii zapisu i ponowienie żądania
    let writeFailedAsExpected = false;
    try {
      await pool.query('INSERT INTO invalid_table_trigger_fail (id) VALUES ($1)', ['bad_data']);
    } catch {
      writeFailedAsExpected = true;
    }
    if (!writeFailedAsExpected) {
      console.error("[FAIL] Oczekiwana awaria zapisu nie wystąpiła!");
      process.exit(1);
    }

    // Ponowienie poprawnego żądania po awarii
    const retryConvId = crypto.randomUUID();
    const retryConv = {
      id: retryConvId,
      participantIds: [testIdA, testIdB],
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await instanceA.saveConversation(retryConv);
    const convsAfterRetry = await instanceB.loadAllConversations();
    if (!convsAfterRetry.some(c => c.id === retryConvId)) {
      console.error("[FAIL] Ponowienie żądania po awarii nie powiodło się!");
      process.exit(1);
    }
    console.log("  -> Awaria zapisu i ponowienie żądania obsłużone poprawnie.");

    console.log("==================================================");
    console.log("[PASS] Prawdziwy test wielu instancji zakończony pomyślnie.");
    console.log("Wiadomość, blokada, zmiana statusu, wylogowanie i retry zweryfikowane.");
    console.log("==================================================");
    process.exit(0);
  } catch (err: any) {
    console.error("[ERROR] Wystąpił błąd podczas testu wielu instancji:", err.message);
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
}

runMultiInstanceTest();
