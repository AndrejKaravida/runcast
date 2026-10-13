# Backlog — Cenovni model i naplata

Cilj: definisati šta je besplatno, šta premium (F28 registar) i kako se plaća.

- **Predlog strukture** (iz konkurentske analize): besplatno = plan, weather loop, live tracker,
  logovi, osnovna rang lista; premium = više trka (prvi premium feature ✅), budući: napredna
  analitika, readiness → adaptacija, blending, audio biblioteka. Cena: lokalno prilagođena
  (SR tržište), npr. ~5-8 EUR/mes ili godišnja; probni period 7-14 dana.
- **Tehnički pristup**: web/PWA → Stripe Checkout + webhook → `profiles.premium`/`premium_until`;
  mobilne → RevenueCat (Apple/Google IAP obavezni za digitalne feature-e). Server-side
  enforcement: RLS/RPC provere po premium flag-u (F28 napomena).
- **Preduslovi**: Apple/Google developer nalozi, pravni tekst za pretplatu (uslovi, pravo na
  odustanak), poreska registracija za prodaju.
- **Obim**: M (integracija) + poslovni/administrativni koraci.
- **Zašto odloženo**: prvo dokazati vrednost (retencija) sa besplatnom verzijom; premium UI
  (F28) je već spremno da primi naplatu bez refaktora.
