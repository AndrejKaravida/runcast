# Backlog — Watch aplikacija (Wear OS / watchOS)

Cilj: praćenje treninga sa sata bez telefona — prikaz koraka, pace targeta, cue-ova i snimanje
trčanja direktno na satu.

- **Pristup**: Capacitor nema watch podršku; potrebne su native aplikacije (Wear OS: Kotlin +
  Health Services; watchOS: SwiftUI + WorkoutKit). Komunikacija sa telefonom (Data Layer /
  WatchConnectivity) za plan i sync logova.
- **Preduslovi**: WorkoutKit (iOS), stabilan live tracker (F14) ✅, FIT export (F25) ✅ kao
  referenca za strukturu koraka; native dev kapacitet.
- **Obim**: XL (dva native projekta + store review za watch app).
- **Zašto odloženo**: watch-first je 2026 default kod konkurencije, ali zahteva dedicated
  native razvoj; prva faza je FIT/TCX export na postojeće satove korisnika.
