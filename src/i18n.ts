import type { LanguageCode, LookingFor, SexualRole, Tribe } from './types';

const supported: LanguageCode[] = ['en', 'es', 'de', 'pl'];

export function getDeviceLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'en';
  const preferences = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const preference of preferences) {
    const base = preference.toLowerCase().split('-')[0] as LanguageCode;
    if (supported.includes(base)) return base;
  }
  return 'en';
}

export const language = getDeviceLanguage();

const messages: Record<Exclude<LanguageCode, 'en'>, Record<string, string>> = {
  pl: {
    'Discovery Filters': 'Filtry odkrywania', 'Close': 'Zamknij',
    'Maximum Distance': 'Maksymalna odległość', 'All distances': 'Dowolna odległość',
    'Age Range': 'Przedział wieku', 'Position / Sexual Role': 'Preferowana rola',
    'Tribes': 'Typy', 'Looking For': 'Szukam', 'Online Now Only': 'Tylko dostępni teraz',
    'Verified Profiles Only': 'Tylko zweryfikowane profile', 'Apply Filters': 'Zastosuj filtry',
    'All': 'Wszystkie', 'yrs': 'lat', 'far': 'odległości',
    'Edit Profile': 'Edytuj profil', 'Saved!': 'Zapisano!', 'Name': 'Imię lub pseudonim',
    'Age (18+)': 'Wiek (18+)', 'Location': 'Lokalizacja', 'Role / Position': 'Rola',
    'Short Bio': 'Krótki opis', 'Interests & Tags': 'Zainteresowania i tagi',
    'Tribes & Style': 'Typy i styl', 'Save Changes': 'Zapisz zmiany',
    'Saving Profile...': 'Zapisywanie profilu...', 'Add': 'Dodaj',
    'Top': 'Aktywny', 'Vers Top': 'Uniwersalny aktywny', 'Versatile': 'Uniwersalny',
    'Vers Bottom': 'Uniwersalny pasywny', 'Bottom': 'Pasywny',
    'Side': 'Side (bez seksu analnego)', 'Unspecified': 'Nie określam',
    'Bear': 'Niedźwiedź', 'Otter': 'Wydra', 'Cub': 'Młody niedźwiedź',
    'Jock': 'Sportowiec', 'Clean Cut': 'Zadbany', 'Muscle': 'Umięśniony',
    'Dating': 'Randki', 'Hookups': 'Przygody', 'Friends': 'Przyjaźń',
    'Networking': 'Kontakty', 'Relationship': 'Związek', 'Right Now': 'Teraz', 'Chat': 'Rozmowa'
  },
  es: {
    'Discovery Filters': 'Filtros de búsqueda', 'Close': 'Cerrar',
    'Maximum Distance': 'Distancia máxima', 'All distances': 'Cualquier distancia',
    'Age Range': 'Rango de edad', 'Position / Sexual Role': 'Rol sexual',
    'Tribes': 'Tipos', 'Looking For': 'Busco', 'Online Now Only': 'Solo conectados',
    'Verified Profiles Only': 'Solo perfiles verificados', 'Apply Filters': 'Aplicar filtros',
    'All': 'Todos', 'yrs': 'años', 'far': 'de distancia',
    'Edit Profile': 'Editar perfil', 'Saved!': '¡Guardado!', 'Name': 'Nombre o apodo',
    'Age (18+)': 'Edad (18+)', 'Location': 'Ubicación', 'Role / Position': 'Rol',
    'Short Bio': 'Presentación breve', 'Interests & Tags': 'Intereses y etiquetas',
    'Tribes & Style': 'Tipos y estilo', 'Save Changes': 'Guardar cambios',
    'Saving Profile...': 'Guardando perfil...', 'Add': 'Añadir',
    'Top': 'Activo', 'Vers Top': 'Versátil activo', 'Versatile': 'Versátil',
    'Vers Bottom': 'Versátil pasivo', 'Bottom': 'Pasivo',
    'Side': 'Side (sin sexo anal)', 'Unspecified': 'Sin especificar',
    'Bear': 'Oso', 'Otter': 'Nutria', 'Cub': 'Osito',
    'Jock': 'Deportista', 'Clean Cut': 'Pulcro', 'Muscle': 'Musculoso',
    'Dating': 'Citas', 'Hookups': 'Encuentros', 'Friends': 'Amistad',
    'Networking': 'Contactos', 'Relationship': 'Relación', 'Right Now': 'Ahora', 'Chat': 'Conversar'
  },
  de: {
    'Discovery Filters': 'Entdecken-Filter', 'Close': 'Schließen',
    'Maximum Distance': 'Maximale Entfernung', 'All distances': 'Alle Entfernungen',
    'Age Range': 'Altersbereich', 'Position / Sexual Role': 'Sexuelle Rolle',
    'Tribes': 'Typen', 'Looking For': 'Ich suche', 'Online Now Only': 'Nur jetzt online',
    'Verified Profiles Only': 'Nur verifizierte Profile', 'Apply Filters': 'Filter anwenden',
    'All': 'Alle', 'yrs': 'Jahre', 'far': 'entfernt',
    'Edit Profile': 'Profil bearbeiten', 'Saved!': 'Gespeichert!', 'Name': 'Name oder Spitzname',
    'Age (18+)': 'Alter (18+)', 'Location': 'Standort', 'Role / Position': 'Rolle',
    'Short Bio': 'Kurzbeschreibung', 'Interests & Tags': 'Interessen und Tags',
    'Tribes & Style': 'Typen und Stil', 'Save Changes': 'Änderungen speichern',
    'Saving Profile...': 'Profil wird gespeichert...', 'Add': 'Hinzufügen',
    'Top': 'Aktiv', 'Vers Top': 'Vielseitig aktiv', 'Versatile': 'Vielseitig',
    'Vers Bottom': 'Vielseitig passiv', 'Bottom': 'Passiv',
    'Side': 'Side (ohne Analverkehr)', 'Unspecified': 'Keine Angabe',
    'Bear': 'Bär', 'Otter': 'Otter', 'Cub': 'Jungbär',
    'Jock': 'Sportler', 'Clean Cut': 'Gepflegt', 'Muscle': 'Muskulös',
    'Dating': 'Dates', 'Hookups': 'Unverbindliche Treffen', 'Friends': 'Freundschaft',
    'Networking': 'Kontakte', 'Relationship': 'Beziehung', 'Right Now': 'Jetzt', 'Chat': 'Chatten'
  }
};

export const t = (source: string): string => language === 'en' ? source : messages[language][source] || source;
export const labelRole = (value: SexualRole): string => t(value);
export const labelTribe = (value: Tribe): string => t(value);
export const labelLookingFor = (value: LookingFor): string => t(value);
