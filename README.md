# Rotterdam Underground

A GTA2-style top-down action game set in Rotterdam, Netherlands. Built with
vanilla JavaScript, HTML5 Canvas 2D and ES modules — no build step, no
external assets. Every graphic is drawn procedurally and every sound is
synthesized in real time with the Web Audio API.

## Running it locally

No build tools or dependencies are required — just serve the folder over
HTTP (ES modules can't load from `file://`):

```bash
# any static file server works, for example:
npx http-server -p 8080
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Walk (on foot) / drive (in a vehicle) |
| `Shift` | Sprint (on foot) |
| `Space` | Jump — over low walls, onto car roofs, across gaps |
| `Mouse` | Aim |
| `Left Click` | Shoot |
| `Right Click` | Melee attack |
| `E` | Enter / exit vehicle, use payphone, sprayshop, bomb shop, car crusher, food vendor |
| `Q` | Switch weapon |
| `P` / `Esc` | Pause |

## World

An 8192×8192 pixel open city split by the river Maas, crossable only via the
Erasmusbrug (bridge) or the Maastunnel. Seven Rotterdam districts, each with
its own building palette and density:

- **Centrum** — glass towers and neon, home of the Neon Syndicaat gang
- **Delfshaven** — old canal houses, home of the Delfse Crew
- **Noord** — northern residential strip
- **Kop van Zuid** — modern riverside towers (De Rotterdam, Erasmusbrug approach)
- **Katendrecht** — low brick housing, home of Zuid Bende
- **Feijenoord** — mixed residential/industrial
- **Maashaven / Waalhaven (harbour)** — industrial grey and rust, cranes and
  container stacks, home of the Havenratten gang

Landmarks: Erasmusbrug, Euromast, Markthal, Kubuswoningen, De Rotterdam,
Hofplein roundabout, Coolsingel and Blaak.

## Gameplay systems

- **Gang territory & respect** — helping one gang's payphone missions raises
  respect with them and lowers it with their rivals; low enough respect makes
  a gang's members hostile on sight.
- **Payphone missions** — walk up to a ringing payphone and press `E` to pick
  up a job: kill a rival, steal and deliver a car, destroy rival vehicles, or
  survive an attack.
- **Wanted system** — up to 5 stars, escalating from local Politie to SWAT,
  FBI and Leger (army) as heat rises. Wanted level decays over time, or is
  wiped instantly at a sprayshop.
- **Shops** — bomb shops arm your car with a remote detonator (right-click to
  blow it), car crushers pay cash for wrecking a vehicle, food vendors
  restore health for a few euros.
- **Kill Frenzy** — a pulsing star pickup starts a timed rampage bonus round;
  clear the kill quota before the timer runs out for a cash bonus.
- **Chunky arcade driving** — five vehicle types with simple, punchy arcade
  physics rather than realistic handling.

## Technical notes

- Procedural, seeded world generation with a spatial chunk hash — only
  chunks overlapping the camera are iterated for drawing and collision.
- Targets a steady 60 FPS; all rendering is plain Canvas 2D, fully in color.
- File layout: `src/world.js` (city/district/road/river generation),
  `src/player.js`, `src/vehicles.js`, `src/weapons.js`, `src/npc.js`,
  `src/police.js`, `src/missions.js`, `src/audio.js`, `src/ui.js`,
  `src/menu.js`, tied together by `src/main.js`.
