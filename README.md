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
/family_chores_static/family-chores-card.js?v=0.2.3
```

## Karte

```yaml
type: custom:family-chores-card
```

## Update-Hinweis

Nach einem Update der JavaScript-Karte die Versionsnummer am Ende der Ressourcen-URL
anpassen und den Browser bzw. das Wandtablet neu laden.


## Separate Verwaltungskarte ab v0.2.3

Die Familienansicht enthält keine Verwaltungs-Schaltfläche mehr. Die Verwaltung ist eine eigene Karte.

Zusätzliche Lovelace-Ressource:

```text
/family_chores_static/family-chores-admin-card.js?v=0.2.3
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
