# Family Chores

Familien-Aufgaben für Home Assistant mit Punktesystem, Wochenzielen, Rotation und Belohnungen.

## Funktionen

- Aufgaben pro Familienmitglied
- Punkte je Aufgabe
- Wochenziel mit Fortschrittsbalken
- Belohnungen mit frei definierbaren Punktekosten
- Belohnungen direkt pro Person einlösen
- Einmalige und wiederkehrende Aufgaben
- Bestimmte Wochentage, wöchentlich, alle X Wochen und monatlich
- Optionale Rotation zwischen Familienmitgliedern
- Optionale Bestätigung vor Punktegutschrift
- Manuelle Punkteanpassungen
- Verlauf
- Sensoren für Punkte und offene Aufgaben
- Lovelace-Karte mit Verwaltungsmodus
- Lokale Home-Assistant-Brand-Icons
- HACS- und Hassfest-Validierungsworkflow

## Installation über HACS

1. Dieses Repository auf GitHub anlegen, z. B. `Matzebodyguard/family_chores`.
2. Den Inhalt dieses ZIPs in das Repository hochladen.
3. In HACS zu **Integrationen** wechseln.
4. Über das Menü **Benutzerdefinierte Repositories** öffnen.
5. Repository-URL eintragen und Kategorie **Integration** wählen.
6. **Family Chores** installieren.
7. Home Assistant neu starten.
8. Unter **Einstellungen → Geräte & Dienste → Integration hinzufügen** nach **Family Chores** suchen.
9. Familienmitglieder eintragen.

## Lovelace-Ressource

```text
/family_chores_static/family-chores-card.js
```

## Karte

```yaml
type: custom:family-chores-card
```

## Update-Hinweis

Nach einem Update der JavaScript-Karte die Versionsnummer am Ende der Ressourcen-URL
anpassen und den Browser bzw. das Wandtablet neu laden.


## Separate Verwaltungskarte ab v0.2.4

Die Familienansicht enthält keine Verwaltungs-Schaltfläche mehr. Die Verwaltung ist eine eigene Karte.

Zusätzliche Lovelace-Ressource:

```text
/family_chores_static/family-chores-admin-card.js
```

Familienkarte:

```yaml
type: custom:family-chores-card
```

Verwaltungskarte:

```yaml
type: custom:family-chores-admin-card
```

Damit kann die Verwaltung z. B. auf einem separaten, nur für Eltern sichtbaren Dashboard abgelegt werden.


## Breite in Sections-Dashboards

Die Karten melden sich ab v0.2.4 als `columns: full` an und nehmen damit immer die komplette
Breite ihrer **Section** ein.

Wichtig: Soll die Karte über mehrere Dashboard-Spalten reichen, muss auch die umgebende Section
mehrere Spalten überspannen. Beispiel für drei Spalten:

```yaml
type: sections
max_columns: 3
sections:
  - type: grid
    column_span: 3
    cards:
      - type: custom:family-chores-card
        grid_options:
          columns: full
          rows: auto
```

Eine Karte kann aus ihrer eigenen Section heraus nicht selbst die Breite benachbarter Sections übernehmen.


## Neu in v0.3.0

- Familienkarte mit **Heute / Diese Woche / Alle**.
- Bei mehreren Zuständigen kann pro Aufgabe gewählt werden:
  - **Gemeinsam – einmal erledigen**
  - **Individuell – jede Person erledigt selbst**
- Im individuellen Modus erhält jede Person ihre Punkte erst bei ihrer eigenen Erledigung.
- Bestätigung funktioniert im individuellen Modus ebenfalls je Person.
- Panel-/Landscape-Layout bleibt erhalten.


## Familienkasse und Sparziele (v0.4.0)

Family Chores enthält jetzt eine gemeinsame **Familienkasse**.

- Jedes Familienmitglied kann eigene Punkte an die Familienkasse spenden.
- Gespendete Punkte werden vom persönlichen Punktestand abgezogen.
- Ein aktives Sparziel (z. B. Freizeitpark) wird mit Fortschrittsbalken auf der Familienkarte angezeigt.
- Mehrere Sparziele können in der Admin-Karte angelegt werden; eines davon kann aktiv sein.
- Erreicht das aktive Ziel seinen Zielwert, erscheint **🎉 Ziel erreicht!**.
- Die letzten Spenden sind auf Familien- und Admin-Karte sichtbar.
- Sparziele können bearbeitet, aktiviert, abgeschlossen und gelöscht werden.
- Beim Löschen eines Sparziels bleiben bereits gespendete Punkte in der Familienkasse.

### Lovelace-Ressourcen

Die Ressourcen werden ab v0.4.0 bewusst **ohne Versionsparameter** eingebunden:

```text
/family_chores_static/family-chores-card.js
/family_chores_static/family-chores-admin-card.js
```

Damit müssen die Ressourcen-URLs bei zukünftigen Releases nicht mehr angepasst werden.
Nach einem Update genügt normalerweise ein Home-Assistant-Neustart und Neuladen des Dashboards.
