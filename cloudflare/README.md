# Cloudový hlas (Azure Speech zdarma + Cloudflare Worker)

Hra umí mluvit hlasy **Vlasta** a **Antonín** (Azure Speech, tarif F0 = zdarma do 500 000 znaků měsíčně, bez doúčtování).
Klíč zůstává v Cloudflare Workeru, hra jen volá jeho adresu. Stejné věty se ukládají do cache, takže skutečná spotřeba je malá.
Když cloud selže nebo se vyčerpá limit, hra sama přepne na offline hlas Piper.

## Jednorázové nastavení (asi 15 minut)

1. **Azure:** na https://portal.azure.com vytvořte zdroj „Speech“ (Speech service), cenová úroveň **Free F0**, region např. `westeurope`. V sekci „Keys and Endpoint“ si zkopírujte **KEY 1** a region. (Účet Azure chce platební kartu k ověření, F0 se ale neúčtuje.)
2. **Cloudflare:** založte bezplatný účet na https://dash.cloudflare.com.
3. Na počítači (Node.js nainstalovaný):

```bash
cd cloudflare
npx wrangler login
npx wrangler secret put AZURE_KEY
npx wrangler secret put AZURE_REGION
npx wrangler deploy
```

Příkaz `deploy` vypíše adresu typu `https://zos-tts.<vase-jmeno>.workers.dev`.

4. Tuto adresu zadejte v hře: **Nastavení → Adresa cloudu**. Aby ji měli i kolegové automaticky, vložte ji do `src/data.js` jako `ttsUrl` a vydejte novou verzi.

## Zkouška

```bash
curl -o test.mp3 "https://zos-tts.<vase-jmeno>.workers.dev/tts?voice=cs-CZ-VlastaNeural&rate=0&text=ZCB%20sto%20jedna%20na%20p%C5%99%C3%ADjmu"
```

## Bezpečnost a limity

- Worker přijímá jen požadavky z webu hry (`ALLOWED_ORIGINS` ve `wrangler.toml`), text nejvýše 300 znaků, jen dva povolené hlasy.
- Klíč nikdy nepatří do repozitáře ani do `src/`.
- Při vyčerpání limitu F0 Azure odpovídá 429; hra přejde na Piper do dalšího měsíce.
