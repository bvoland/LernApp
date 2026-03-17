# Mathe Mission Agent Guide

## Projektziel

`Mathe Mission` ist eine browserbasierte Lernapp fuer Kinder der 1. bis 3. Klasse. Kinder loesen Matheaufgaben, erreichen eine Mindestquote und erspielen dadurch Medienminuten. Die App ist als statische Website aufgebaut und wird ueber GitHub Pages betrieben.

## Technischer Aufbau

- `index.html`: gesamte App-Struktur und alle UI-Bereiche
- `app.js`: komplette Anwendungslogik, Aufgaben-Generator, Auswertung, Speicherung, Supabase-Anbindung, Version-Refresh
- `styles.css`: Layout, mobile Optimierung und Aufgaben-Darstellung
- `config.js`: Supabase-Konfiguration
- `supabase.sql`: Tabellen fuer Lernrunden und Minuteneinloesungen
- `sw.js`: Service Worker fuer Cache und Update-Verhalten
- `version.json`: sichtbare App-Version fuer den Aktualisieren-Button

## Kernlogik

- Kinder koennen ohne Eltern-PIN ausgewaehlt werden.
- Die Anzahl der Aufgaben pro Runde ist frei aenderbar, auch ohne Eltern-PIN.
- Einstellungen wie Zielquote, Klassenstufe und kindbezogene Freigaben sind durch die Eltern-PIN `0922` geschuetzt.
- Medienzeit wird nicht direkt abgespielt, sondern als Minutenkonto gesammelt.
- Es gilt: `10 Aufgaben = 1,0 Minute`.
- Minuten werden nur gutgeschrieben, wenn die Rundenergebnisse mindestens die eingestellte Zielquote erreichen.
- Fuer jedes `10.` Mal `100%` an einem einzelnen Kalendertag gibt es `2,0 Bonusminuten` extra.
- Minuten koennen per Elternfreigabe eingeloest und dabei auf `0` gesetzt werden.
- Lernhistorie und Statistik bleiben dabei erhalten.

## Kinderprofile

Standardprofile:

- `Lukas`: fest auf 3. Klasse
- `Amelie`: startet in 1. Klasse, darf bis 3. Klasse hochgesetzt werden
- `Kathi`: fest auf 3. Klasse
- `Benny`: fest auf 3. Klasse

Profile werden lokal gespeichert. Rundenergebnisse und Einloesungen werden kindbezogen in Supabase gespeichert.

## Aufgabenlogik nach Klassenstufe

### 1. Klasse

- Addition und Subtraktion
- Zahlenraum per Elternmodus: `1-10` oder `1-20`
- Rechenart per Elternmodus: `nur +`, `nur -` oder `gemischt`

### 2. Klasse

- Addition
- Subtraktion
- Multiplikation
- Division
- schriftliche Addition
- Euro-und-Cent-Addition

### 3. Klasse

- Addition
- Subtraktion
- Multiplikation
- Division
- schriftliche Addition
- Euro-und-Cent-Addition
- Gewichtung aktuell ungefaehr `60% Multiplikation/Division` und `40% Addition/Subtraktion/weitere Additionsformen`

## Besondere Aufgabentypen

### Schriftliche Addition

- `kind: "written_add"`
- wird gestapelt dargestellt
- nutzt gezielt Aufgaben mit Uebertrag

### Euro und Cent

- `kind: "money_add"`
- intern werden Werte als Cent gespeichert
- Eingaben wie `3,50`, `3.50`, `3,5`, `3,50 Euro` oder `3,50 EUR` werden akzeptiert

## Speicherung

### Lokal

- Einstellungen, Profile, Historie und Einloesungen werden im Browser gespeichert

### Supabase

Verwendete Tabellen:

- `learning_rounds`
- `learning_minute_redemptions`

Wenn Supabase nicht erreichbar ist, faellt die App automatisch auf lokalen Speicher zurueck. In der UI wird dann `Datenquelle: nur dieses Geraet` angezeigt.

## Wichtige UI-Bereiche

- Kinderauswahl
- Elternbereich mit PIN-Freigabe
- Aufgabenbereich
- Ergebnisse und Historie
- Minutenkonto
- Statistik fuer `Heute`, `Monat`, `Gesamt`
- Gesamtuebersicht aller Kinder
- Versionsbereich mit Aktualisieren-Button

## Versionspflege

Bei jeder sichtbaren Aenderung bitte immer beides aktualisieren:

1. `APP_VERSION` in `app.js`
2. `version` in `version.json`

Danach sollte die App ueber den eingebauten `Aktualisieren`-Button oder durch Neuladen den neuen Stand ziehen.

## Hinweise fuer kuenftige Agents

- Keine Build-Pipeline noetig, die App ist komplett statisch.
- Keine Frameworks im Einsatz.
- Wenn neue Aufgabentypen eingebaut werden, immer diese Stellen zusammen anpassen:
  - Generator in `app.js`
  - Rendering in `renderQuestions()`, `createQuestionLabel()` oder `createQuestionVisual()`
  - Auswertung in `evaluateRound()`
  - Anzeige richtiger Antworten in `updateQuestionFeedback()`
- Bei sichtbaren Aenderungen immer die Version erhoehen.
- Mobile Darstellung immer mitdenken, besonders fuer iPhone.
