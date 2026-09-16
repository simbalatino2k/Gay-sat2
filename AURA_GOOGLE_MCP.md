# AURA Google MCP — wersja startowa 0.1

Dokumentacja architektoniczna, wdrożeniowa oraz operacyjna modułu integracji Model Context Protocol (MCP) dla ekosystemu AURA i usług Google Cloud.

Szczegółowa dokumentacja znajduje się również w pliku [`docs/AURA_GOOGLE_MCP.md`](./docs/AURA_GOOGLE_MCP.md).

---

## Model Architektoniczny i Bezpieczeństwo Połączeń

1. **ChatGPT → MCP:** OAuth 2.1 u wybranego dostawcy tożsamości. Ten pakiet weryfikuje tokeny JWT oraz udostępnia protected-resource metadata; **NIE** zawiera serwera logowania/authorization server.
2. **MCP → Google Cloud:** dedykowane konto usługi Cloud Run przez Application Default Credentials (ADC). Tokenu ChatGPT nie przekazuje się do Google.

### Wymagania dotyczące weryfikacji tokenów JWT:
- Token JWT musi posiadać właściwy podpis kryptograficzny `RS256` lub `ES256`.
- Prawidłowe wartości nagłówka i roszczeń:
  - `iss`: zgodny z `OAUTH_ISSUER`,
  - `aud`: równy dokładnemu `PUBLIC_URL/mcp`,
  - `exp`, `iat`: weryfikacja ważności czasowej,
  - `sub`: musi znajdować się na liście dopuszczonych identyfikatorów `ALLOWED_SUBJECTS`,
  - zakres (scope): wymagany zakres `aura:read`. Dla operacji Gemini wymagany jest dodatkowo zakres `aura:gemini`.
- **Wymóg bezwzględny:** Nie używaj tokenów ID (ID tokens) zamiast access tokenów. Dostawca OAuth musi wydawać access tokeny w wymaganym formacie, obsługiwać PKCE S256, discovery, parametr `resource` i klienta ChatGPT (statycznego, CIMD albo DCR).
- **Uwaga:** Samo wklejenie adresu logowania Google w `OAUTH_ISSUER` nie zapewni spełnienia tego kontraktu.

---

## Krok 1 — Skonfiguruj logowanie (warunek przed publicznym uruchomieniem)

1. W wybranym dostawcy OAuth utwórz API/resource o `audience` równym przyszłemu adresowi MCP (`PUBLIC_URL/mcp`).
2. Ogranicz użytkowników wyłącznie do siebie (właściciela), dodaj zdefiniowane powyżej zakresy (`aura:read`, `aura:gemini`) i zarejestruj klienta ChatGPT zgodnie z aktualnym formularzem integracji.
3. Dodaj dokładny adres callback pokazany przez interfejs ChatGPT — bez wildcardów (`*`). Konfiguracja jest zależna od dostawcy i musi zostać zweryfikowana przed wdrożeniem.
4. Uzupełnij zmienne środowiskowe w konfiguracji:
   - `OAUTH_ISSUER`
   - `OAUTH_JWKS_URL`
   - `ALLOWED_SUBJECTS`
   - `PUBLIC_URL`
5. W publicznym serwerze **nie ma przełącznika wyłączającego autoryzację** (fail-closed security).

---

## Krok 2 — Uruchomienie i test lokalny

Wymagane środowisko: **Node.js 22+** i **npm**.

W katalogu projektu:
```bash
npm install --ignore-scripts
npm run check
npm test
cp .env.example .env
```

### Zasady higieny i konfiguracji:
- Edytuj `.env` prywatnie — pod żadnym pozorem nie wysyłaj go do czatu ani nie zatwierdzaj do repozytorium gita.
- Do lokalnego odczytu Google skonfiguruj Application Default Credentials (ADC):
  ```bash
  gcloud auth application-default login
  ```
  Używaj konta z minimalnymi, niezbędnymi uprawnieniami.
- Uruchomienie serwera:
  ```bash
  npm start
  ```
- **Lokalny adres endpointu:** `http://localhost:8080/mcp`.
- **Dostęp z ChatGPT:** ChatGPT nie może połączyć się z adresem `localhost` bez tunelu; użyj zabezpieczonego tunelu MCP albo docelowego endpointu HTTPS.
- **Poufność:** Tokeny i prywatne dane nigdy nie trafiają do instrukcji ani logów aplikacji.

---

## Krok 3 — Przygotuj oddzielną usługę Cloud Run

- **Izolacja usług:** **Nie zmieniaj istniejącej usługi `aura`**.
- **Nowa dedykowana usługa:** `aura-mcp`.
- **Parametry Cloud Run:**
  - Osobne dedykowane konto usługi (Service Account) z minimalnymi uprawnieniami IAM,
  - Minimum instancji: `0`,
  - Maksimum instancji: `1`,
  - Pamięć RAM: `256–512 MiB`,
  - Region: `europe-west2`.
  - Kontener: budowany z dołączonego `Dockerfile`.
- **Kontrola kosztów:** Nie uruchamiaj wdrożenia, dopóki nie zaakceptujesz kosztów i nie skonfigurujesz OAuth. Proces budowania (Cloud Build), przechowywanie obrazu (Artifact Registry) i działanie instancji mogą generować koszty.

---

## Testy akceptacyjne przed użyciem z prawdziwymi danymi

Przed podłączeniem rzeczywistych danych produkcyjnych należy zweryfikować następujące scenariusze:

1. **Brak autoryzacji:** Wywołanie `/mcp` bez tokenu zwraca kod HTTP `401 Unauthorized` i nagłówek challenge OAuth; endpointy metadata oraz health nie ujawniają żadnych danych wewnętrznych.
2. **Odrzucenie nieprawidłowych tokenów:** Natychmiastowe odrzucenie żądań w przypadku: nieprawidłowego podpisu, wygasłego tokenu (`exp`), obcego `audience`, obcego `issuer`, identyfikatora `sub` spoza listy `ALLOWED_SUBJECTS` lub braku wymaganego zakresu.
3. **MCP Inspector:** Pomyślna weryfikacja interakcji: `initialize`, `tools/list`, `search`, `fetch` oraz prawidłowa walidacja i obsługa błędów dla nieznanego ID.
4. **Uprawnienia Google Cloud:** Zweryfikuj wszystkie 4 odczyty Google na docelowym koncie bez nadawania szerokich ról administracyjnych.
5. **Cykl życia sesji ChatGPT:** Zweryfikuj procedurę logowania, odmowę dostępu obcej osobie, odnawianie sesji oraz cofnięcie dostępu w ChatGPT. 
   - *Uwaga:* Przy tokenach JWT unieważnienie u dostawcy może zadziałać dopiero po wygaśnięciu tokenu; stosuj krótki TTL (np. 5–15 minut). Awaryjnie: natychmiast usuń dany `sub` ze zmiennej `ALLOWED_SUBJECTS` i zrestartuj/wdroż usługę ponownie.
6. **Integracja Gemini:** Wyłączone narzędzie nie występuje w schemacie; brak zakresu `aura:gemini` nie wywołuje API Google; ścisła kontrola kosztów i przesyłanego tekstu promptu.
7. **Monitoring i alerty:** Skonfiguruj alerty Cloud Run, monitoring błędów `5xx`, limity kosztów/kwot oraz alarm budżetowy GCP (należy pamiętać, że alarm budżetowy powiadamia, lecz nie stanowi twardego odcięcia finansowego).

### Limity przepustowości:
- **Rate limiting aplikacji:** `30 żądań / minutę / użytkownika / instancję`.
- Limit aplikacyjny nie zastępuje globalnych limitów GCP, ochrony przed atakami DDoS ani alertów kosztowych.
- Pakiet nie jest po audycie produkcyjnym.

---

## °° Punkt ważny: Długa nieobecność właściciela — osobny zakres

Zostało tylko uruchomić resztę stałego monitoringu działań bez nadzoru. Poniższy zakres podlega formalnemu zatwierdzeniu przed włączeniem trybu bezobsługowego:

1. **Automatyczne kontrole dostępności i konfiguracji oraz powiadomienia:**
   - Ciągłe sprawdzanie uptime'u endpointów zdrowia (`health check`) i ważności certyfikatów.
   - Automatyczne powiadomienia na autoryzowany kanał w przypadku odchyleń konfiguracyjnych lub awarii.
2. **Zarządzane kopie zapasowe (Cloud SQL):**
   - Regularne, zautomatyzowane backupy bazy danych Cloud SQL.
   - Obowiązkowo przetestowana i udokumentowana procedura odtwarzania (disaster recovery).
3. **Restrykcyjna polityka wycofywania zmian (Rollback):**
   - Ewentualny rollback wyłącznie do wcześniej zatwierdzonej, stabilnej rewizji.
   - Rollback może nastąpić wyłącznie po przejściu zdefiniowanych, zautomatyzowanych testów integralności.
4. **Twarde zakazy automatyzacji (Zero-Trust Guardrails):**
   - **Bezwzględny zakaz automatycznego kasowania danych.**
   - **Bezwzględny zakaz automatycznej zmiany uprawnień IAM i ról usługowych.**
   - **Bezwzględny zakaz podnoszenia budżetów lub limitów wydatków bez ręcznej autoryzacji.**
   - **Bezwzględny zakaz samoczynnego publikowania nowego kodu na środowisko produkcyjne.**
5. **Kontakt awaryjny:**
   - Wyznaczenie i zarejestrowanie kontaktu awaryjnego upoważnionego bezpośrednio przez właściciela na wypadek incydentów bezpieczeństwa lub przestojów.
