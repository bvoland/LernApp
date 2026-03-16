# Mathe Mission

Eine einfache Lernapp als PWA fuer GitHub Pages. Kinder koennen pro Runde Matheaufgaben loesen und bekommen nur bei mindestens 95 Prozent richtigen Antworten fuer 2 Minuten eine Videobelohnung.

## Funktionen

- Addition, Subtraktion, Multiplikation und Division im Zahlenbereich bis 1000
- Standardmaessig 20 Aufgaben pro Runde, anpassbar zwischen 5 und 40
- Auswertung aller Antworten mit Anzeige der richtigen Ergebnisse
- Themenauswahl fuer Minecraft, Robotik und Lego
- Freischaltung des ausgewaehlten YouTube-Videos fuer 2 Minuten bei mindestens 95 Prozent
- Danach erneute Sperre, bis wieder eine komplette neue Runde geloest wurde
- Elternschutz: Einstellungen und Video-Links nur mit PIN `0922` aenderbar
- Ergebnisverlauf mit lokalem Speicher und optionaler Supabase-Synchronisierung
- Installierbar als PWA und offline nutzbar

## GitHub Pages

1. Repository bei GitHub anlegen und diese Dateien hochladen.
2. Unter `Settings -> Pages` den Branch mit dem Projektordner als Quelle auswaehlen.
3. Nach dem Deploy laeuft die App ohne Build-Schritt direkt auf GitHub Pages.

## Supabase Ergebnisse speichern

1. In Supabase SQL Editor den Inhalt aus `supabase.sql` ausfuehren.
2. Die Verbindung ist in `config.js` bereits auf dieselbe Supabase-Instanz wie in `TaskApp` gesetzt.
3. Solange die Tabelle `learning_rounds` noch nicht existiert, speichert die App automatisch nur lokal im Browser.

## Hinweis zu YouTube

Im Elternbereich kann fuer jedes Thema eine YouTube-URL oder Embed-URL eingetragen werden, zum Beispiel:

`https://www.youtube.com/embed/VIDEO_ID`

Normale YouTube-Links werden zwar umgewandelt, aber manche Videos verbieten Einbettung. In dem Fall muss ein anderes Video verwendet werden.

Direkte eingebettete Suchergebnisse von YouTube werden nicht verwendet. Stattdessen wird pro Thema ein hinterlegtes Video abgespielt und nach 2 Minuten automatisch pausiert und wieder gesperrt.
