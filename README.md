# Mathe Mission

Eine einfache Lernapp als PWA fuer GitHub Pages. Kinder koennen pro Runde Matheaufgaben loesen und bei erreichter Zielquote Minuten fuer ihre Medienzeit erspielen.

## Funktionen

- Nutzerwahl mit Standardkindern: Lukas, Amelie, Kathi und Benny
- Bereits bekannte Kinder koennen erneut ausgewaehlt werden
- Pro Kind kann im Elternmodus 1., 2. oder 3. Klasse freigeschaltet werden
  Lukas ist fest auf 3. Klasse, Amelie startet auf 1. Klasse und kann spaeter hochgesetzt werden
- Fuer die 1. Klasse gibt es zusaetzliche Filter: Zahlenraum 1-10 oder 1-20 sowie nur Plus, nur Minus oder gemischt
- Addition, Subtraktion, Multiplikation und Division je nach Klassenstufe
- Standardmaessig 20 Aufgaben pro Runde, anpassbar zwischen 5 und 40
- Auswertung aller Antworten mit Anzeige der richtigen Ergebnisse
- Je 10 Aufgaben gibt es 1,0 Minute Medienzeit
- Gutschrift nur bei erreichter Zielquote
- Elternmodus kann die Zielquote anpassen
- Tageskonto, Gesamtguthaben und geschuetztes Einloesen per Eltern-PIN
- Elternschutz: Einstellungen nur im Elternmodus aenderbar
- Ergebnisverlauf mit lokalem Speicher und optionaler Supabase-Synchronisierung
- Statistik fuer Tag, Monat und Gesamt mit Aufgaben, richtigen Antworten und Fehlerquote
- Sprachansage beim Start einer neuen Runde
- Versionsanzeige mit Aktualisieren-Button zum Leeren des PWA-Caches
- Installierbar als PWA und offline nutzbar

## GitHub Pages

1. Repository bei GitHub anlegen und diese Dateien hochladen.
2. Unter `Settings -> Pages` den Branch mit dem Projektordner als Quelle auswaehlen.
3. Nach dem Deploy laeuft die App ohne Build-Schritt direkt auf GitHub Pages.

## Supabase Ergebnisse speichern

1. In Supabase SQL Editor den Inhalt aus `supabase.sql` ausfuehren.
2. Die Verbindung ist in `config.js` bereits auf dieselbe Supabase-Instanz wie in `TaskApp` gesetzt.
3. Das SQL legt sowohl `learning_rounds` als auch `learning_minute_redemptions` an.
4. Solange die Tabellen noch nicht existieren, speichert die App automatisch nur lokal im Browser.
