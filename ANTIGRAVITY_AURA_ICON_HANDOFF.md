# AURA — zatwierdzone logo i ikony

Użytkownik zatwierdził dokładnie obraz w `assets/brand/aura-original.jpg` (SHA-256: `B78C04ED624716F64D7C6BDF979F5B553E5C28106B3FCBE83CF61FF26C55B6D3`). Nie przerysowywać znaku ani nie zmieniać jego kolorów.

`npm run icons:generate` tworzy pliki z tego obrazu. Android (natywny i PWA) ma znak bez ciemnego kwadratowego tła, również w ikonach `mipmap-*` i `public/icon-*.png`. `public/apple-touch-icon.png` jest przezroczysty dla skrótu na ekranie iPhone. Natywna ikona iOS `AppIcon-1024.png` zachowuje ciemne tło, ponieważ płaski zasób App Store musi być nieprzezroczysty.

Ikony Androida mają przezroczyste narożniki i tło adaptacyjne `#00000000`. W repo przywrócono brakujące pliki szkieletu Gradle. Kompilacja webowa i TypeScript przeszły lokalnie; podpisany AAB oraz test na urządzeniu nadal są otwarte. Zmiany w GitHubie nie oznaczają wdrożenia AI Studio/Cloud Run. Publiczne `/api/health` ostatnio zgłaszało `ready:false` z powodu inicjalizacji PostgreSQL — nie deklarować gotowości publikacji bez naprawy i testu.
