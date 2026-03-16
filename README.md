# Mathe Mission

Eine einfache Lernapp als PWA fuer GitHub Pages. Kinder koennen pro Runde Matheaufgaben loesen und bekommen nur bei mindestens 95 Prozent richtigen Antworten fuer 2 Minuten eine Videobelohnung.

## Funktionen

- Addition, Subtraktion, Multiplikation und Division im Zahlenbereich bis 1000
- Standardmaessig 20 Aufgaben pro Runde, anpassbar zwischen 5 und 40
- Auswertung aller Antworten mit Anzeige der richtigen Ergebnisse
- Freischaltung eines YouTube-Videos fuer 2 Minuten bei mindestens 95 Prozent
- Danach erneute Sperre, bis wieder eine komplette neue Runde geloest wurde
- Installierbar als PWA und offline nutzbar

## GitHub Pages

1. Repository bei GitHub anlegen und diese Dateien hochladen.
2. Unter `Settings -> Pages` den Branch mit dem Projektordner als Quelle auswaehlen.
3. Nach dem Deploy laeuft die App ohne Build-Schritt direkt auf GitHub Pages.

## Hinweis zu YouTube

Fuer das Belohnungsvideo sollte eine Embed-URL eingetragen werden, zum Beispiel:

`https://www.youtube.com/embed/VIDEO_ID`

Normale YouTube-Links werden zwar umgewandelt, aber manche Videos verbieten Einbettung. In dem Fall muss ein anderes Video verwendet werden.
