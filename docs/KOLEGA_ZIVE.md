# Kolega živě jako dispečer (návrh, zatím neimplementováno)

Zadání z ankety (17. 11. 2026): vedle bota má jít případ obsluhovat i kolega živě na jiném zařízení. Vyžaduje přenosový server a živý test se dvěma lidmi, proto je tohle jen návrh.

## Architektura
- **Místnost s kódem:** calltaker vytvoří místnost (6 znaků), kolega ji otevře v hlavní aplikaci v běžném režimu dispečera a zadá kód.
- **Přenos:** malý relay (Cloudflare Worker + Durable Object v `cloudflare/`), WebSocket, JSON zprávy; bez ukládání dat, místnost zaniká po 12 hodinách nečinnosti.
- **Autorita:** simulaci vlastní calltaker (`sim.s` je čistý JSON). Dispečer odesílá **příkazy** (`assign`, `cancelAssignment`, `sendAgency`, `radioAnswer`…), calltaker je spustí na enginu a vrací **snímky stavu** (stejný mechanismus jako dnešní `BroadcastChannel` satelitních oken, jen přes relay). Bot se po připojení kolegy vypne (`s.liveCalls.bot = false`).
- **Zprávy:** `state` (snímek, ~2× za sekundu, jen změny), `cmd` (příkaz dispečera, s potvrzením `ack`), `presence`.
- **Bezpečnost:** kód místnosti jako jediné tajemství, žádné osobní údaje (vše je generované), omezení počtu místností a velikosti zpráv v Workeru.

## Co je potřeba
1. Worker a rozhraní `ZOS_LINK` (klient) s výměnným přenosem (BroadcastChannel pro test na jednom počítači, WebSocket pro dva).
2. Příkazová vrstva nad `Sim` (whitelist metod dispečera).
3. Test se dvěma okny a pak s kolegou.
