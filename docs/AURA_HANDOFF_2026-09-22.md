# AURA: przejęcie pracy i warunki publikacji
Data przeglądu: 2026-09-22. Status: NIEGOTOWA do potwierdzonej publikacji komercyjnej.
Cel właściciela: publikacja 2026-09-23. To cel, nie potwierdzony termin.

## Punkt startowy
- Repo: simbalatino2k/Gay-sat2, main 1bd0e80b4bd757ee6eaa0bfa1ce86b9f71feeb88 z 2026-09-20.
- AI Studio zawiera późniejsze zmiany niewidoczne na main. Najpierw wyeksportuj aktualny kod do osobnej gałęzi, porównaj, zachowaj poprawki obu wersji. Nie nadpisuj działającego projektu starą kopią.
- Proponowana poprawka discovery/GPS: commit 92a7a11ae1a11ee50a155845c094f006f3497041, włączony do tej gałęzi. Nie został wdrożony ani scalony.
- Otwarty PR #1 aktualizuje express/qs; nie jest dowodem testów aplikacji.
- Dostępne uruchomienia Actions dotyczą Dependabot, a nie pełnej walidacji wydania.
- auragay.com nadal zwraca HTML Coming Soon (sprawdzone 2026-09-22).
- Obserwowany wcześniej podgląd mapy działał, ale pokazywał 0 osób. Zgłoszenie użytkownika: dwa konta nie widzą się wzajemnie.
- Raporty sukcesu w AI Studio i docs/store/RELEASE_TEST_RESULTS.md są deklaracjami; wymagają powtórzenia na konkretnym SHA i środowisku.

## Kolejność prac
1. Uzgodnij źródło kodu: aktualny eksport AI Studio + zmiany tej gałęzi; zapisz wynikowy SHA.
2. Przejrzyj bezpieczeństwo repo i historyczne artefakty uruchomieniowe prywatnie z właścicielem. Nie kopiuj wartości sekretów ani danych użytkowników do issues, logów i raportów.
3. Ustal autorytatywną bazę po rzeczywistych metadanych połączenia i zagregowanych licznikach. Istnieją dwie instancje Cloud SQL; nie zmieniaj źródła ani nie migruj danych na podstawie podobnej nazwy.
4. Napraw i przetestuj rejestrację Firebase -> zapis profilu PostgreSQL -> odczyt na drugiej sesji/instancji -> zapis GPS -> mapa.
5. Wykonaj świeżą instalację zależności z lockfile, typecheck, build oraz testy w izolowanej bazie testowej.
6. Wdróż kandydat do wydania, sprawdź start po restarcie, bazę, media i dwa niezależne konta.
7. Zweryfikuj płatności, domenę i obsługę użytkowników przed ogłoszeniem gotowości.

## Co zmienia proponowana poprawka
- Discovery czyta aktualnych aktywnych użytkowników z PostgreSQL z blokadami w obu kierunkach, zamiast pamięci pojedynczego procesu.
- updateProfile przyjmuje sparowane, skończone lat/lng w prawidłowym zakresie; nie pozwala zmieniać roli ani weryfikacji.
- Zapis i odczyt JSONB zachowują współrzędne, tryb prywatności oraz listy preferencji.
- Mapa obsługuje odpowiedź {profile}, współrzędne zerowe i błąd zapisu GPS.
- Discover rozróżnia błąd pobierania od pustej listy i odświeża się po odzyskaniu fokusu.
- To nie jest synchronizacja późniejszych zmian AI Studio ani migracja kont Firestore. Sprawdź zgodność przed scaleniem.

## Konfiguracja: sprawdzić, nie zgadywać
| Obszar | Wymagane dane / kontrola |
| --- | --- |
| Serwer | PORT dostawcy, NODE_ENV=production, poprawny start backendu Express z frontendem |
| Baza | Poprawne DATABASE_URL albo komplet SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME; właściwa instancja i tożsamość usługi |
| Cloud SQL socket | CLOUD_SQL_CONNECTION_NAME działa tylko wraz z faktycznym udostępnieniem gniazda w środowisku |
| TLS | CA_CERT wyłącznie zgodnie z metodą połączenia; nie wyłączaj weryfikacji certyfikatów |
| Lokalny magazyn | ALLOW_LOCAL_STORAGE=false w produkcji; nie zastępuj bazy plikiem lub pamięcią |
| Firebase | Istniejąca konfiguracja klienta, poprawny projekt i dozwolone domeny, weryfikacja tokena po stronie serwera |
| Media | Trwały storage i uprawnienia; pliki nie mogą ginąć po restarcie Cloud Run |
| Web Stripe | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_BASE_URL; zgodny tryb test/live i aktywne konto operatora |
| Android billing | GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, GOOGLE_PLAY_PACKAGE_NAME, aktywne produkty sklepu i test licencjonowanego konta |
| iOS billing | APPLE_BUNDLE_ID, APPLE_APP_ID, poprawne środowisko, produkty i pełna weryfikacja transakcji |
| Funkcje opcjonalne | GEMINI_API_KEY, TURN_URLS/TURN_SECRET, Snap Camera Kit tylko dla faktycznie włączonych funkcji |
| Mapa | Domyślny styl OpenFreeMap nie wymaga dodawania klucza mapowego |

Nie kopiuj sekretu z innej bazy tylko dlatego, że pole formularza jest puste. Nie resetuj haseł ani nie twórz płatnych zasobów bez ustalenia potrzeby.

## Testy wymagane przed decyzją o publikacji
- [ ] Dwa rzeczywiste konta testowe w oddzielnych przeglądarkach; oba widzą drugie konto w Discover.
- [ ] Po świadomym włączeniu lokalizacji oba konta pojawiają się na mapie; brak współrzędnych ma czytelny komunikat.
- [ ] HIDDEN usuwa współrzędne z API; przybliżona lokalizacja nie zwraca dokładnych danych; blokada działa w obu kierunkach.
- [ ] Rejestracja, logowanie, odświeżenie tokena, wylogowanie i odzyskanie konta; profil utrzymuje się po restarcie.
- [ ] Wiadomości, zdjęcia i uprawnienia do prywatnych mediów między dwoma kontami; brak dostępu osoby trzeciej.
- [ ] Typecheck i build na wydawanym SHA. npm run test:auth, npm run test:billing, npm run test:multi oraz npm run verify:db w izolowanym środowisku; testy nie mogą dotykać kont produkcyjnych.
- [ ] Test płatności: checkout -> podpisany webhook -> premium; ponowny webhook nie nadaje uprawnienia drugi raz.
- [ ] Nieudana/anulowana płatność nie nadaje premium; refund, wygaśnięcie i odnowienie aktualizują uprawnienia po restarcie.
- [ ] Właściciel potwierdził ceny, walutę i zasady subskrypcji. Obecny backend Stripe ma na stałe USD 14.99/miesiąc i 99.99/rok; nie zakładaj, że to wybrane ceny.
- [ ] Domena i HTTPS prowadzą do aplikacji; /api/health oraz /api/profiles zwracają JSON, nie stronę zastępczą; APP_BASE_URL i Firebase używają tej domeny.
- [ ] Backup z próbą odtworzenia, rollback poprzedniej wersji, monitoring błędów, limity kosztów.
- [ ] Zgłoszenia, blokowanie, usunięcie konta i kontakt wsparcia działają; opublikowane dane operatora, regulamin i polityka prywatności zostały sprawdzone przez właściciela.
- [ ] Jeśli publikacja ma dotyczyć App Store/Google Play, potwierdzono konta deweloperskie, podpisy, listingi, produkty i wymagany proces akceptacji. Gotowa strona WWW nie oznacza gotowej publikacji w sklepach.

## Wyniki z tego przeglądu
PASS: node scripts/test_discovery_regression.mjs (Node 24); serializacja rejestracji, zapis GPS, odczyt z pustą pamięcią lokalną, prywatność, walidacja i ochrona pól.
OGRANICZENIE: test używa atrap transportu SQL, nie żywego PostgreSQL; nie zastępuje testu dwóch kont ani blokad w realnej bazie.
NIEZWERYFIKOWANE: pełny build/typecheck (wcześniejsze pobranie zależności nie powiodło się), produkcyjna baza i płatności, konfiguracja operatorów, aktualny eksport AI Studio.
FAIL: docelowa domena nadal pokazuje Coming Soon.
NIE POTWIERDZONO NAPRAWY: wzajemna widoczność dwóch kont na działającym wdrożeniu.

## Zasady przekazania wyniku
Dla każdego punktu podaj PASS / FAIL / BLOCKED wraz z poleceniem lub scenariuszem, datą, środowiskiem i SHA.
Nie nazywaj testu z atrapami testem produkcyjnym. Nie uznawaj samego builda za dowód działania.
Zakończ konkretną decyzją GO / NO-GO i listą pozostałych blokad. Nie obiecuj przychodu ani publikacji w określonym terminie bez dowodów.
