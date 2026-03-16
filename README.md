# Mathe Mission

Eine einfache Lernapp als PWA fuer GitHub Pages. Kinder koennen pro Runde Matheaufgaben loesen und bei erreichter Zielquote Minuten fuer ihre Medienzeit erspielen.

## Funktionen

- Addition, Subtraktion, Multiplikation und Division im Zahlenbereich bis 1000
- Standardmaessig 20 Aufgaben pro Runde, anpassbar zwischen 5 und 40
- Auswertung aller Antworten mit Anzeige der richtigen Ergebnisse
- Je 10 Aufgaben gibt es 1,0 Minute Medienzeit
- Gutschrift nur bei erreichter Zielquote
- Elternmodus kann die Zielquote anpassen
- Tageskonto und Gesamtstand der erspielten Minuten
- Elternschutz: Einstellungen nur im Elternmodus aenderbar
- Ergebnisverlauf mit lokalem Speicher und optionaler Supabase-Synchronisierung
- Sprachansage beim Start einer neuen Runde
- Installierbar als PWA und offline nutzbar

## GitHub Pages

1. Repository bei GitHub anlegen und diese Dateien hochladen.
2. Unter `Settings -> Pages` den Branch mit dem Projektordner als Quelle auswaehlen.
3. Nach dem Deploy laeuft die App ohne Build-Schritt direkt auf GitHub Pages.

## Supabase Ergebnisse speichern

1. In Supabase SQL Editor den Inhalt aus `supabase.sql` ausfuehren.
2. Die Verbindung ist in `config.js` bereits auf dieselbe Supabase-Instanz wie in `TaskApp` gesetzt.
3. Solange die Tabelle `learning_rounds` noch nicht existiert, speichert die App automatisch nur lokal im Browser.
