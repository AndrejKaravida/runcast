# F21 — Audio vođene sesije (TTS naracija)

Cilj: vođena trka dobija **pripovedački sloj** preko postojećeg TTS sistema (SpeechSynthesis,
bez produkcije zvuka): uvodni brifing, vođenje kroz segmente, motivacija, fueling podsetnik na
dugim trkama i završni rezime. NRC-style audio iskustvo bez studija.

## Trenutno stanje

- `useSpeechCues` + `cueTextFor(kind, context)` (`packages/shared/src/guided.ts:186`) sa
  kind-ovima START/SEGMENT_START/REPEAT/PACE/SEGMENT_END/HALFWAY/PAUSE/RESUME/FINISH/DISTANCE;
  tekstovi u `content.json` (`content:guided.cue.*`, sr/en). Mute postoji.
- `useGuidedRunner` emituje cue-ove na događaje.

## Implementacija

1. **Shared**: novi cue kind-ovi + bogatiji kontekst: `BRIEF` (uvod: tip treninga, ciljna
   distanca/pace zona, „danas radimo X"), `COACH` (kratke linije po tipu: TEMPO/INTERVALS/
   REPETITIONS/EASY/LONG na početku segmenta), `ENCOURAGE` (na 60% treninga), `FUEL` (LONG na
   45 min: „popij gutljaj, uzmi gel ako imaš"), `SUMMARY` (na kraju: ukupno vreme, distanca,
   avg pace, kako je prošlo). `cueTextFor` proširiti; svi tekstovi u `content.json` sr/en,
   humanizovano, bez em-dash-eva.
2. **Scheduler**: u `useGuidedRunner` dodati plan cue tačaka (u sekundama/segmentima) izveden iz
   timeline-a: BRIEF na START, COACH na početku svakog radnog segmenta (ne ponavljati identične
   uzastopno), ENCOURAGE na ~60%, FUEL na 45 min (samo LONG), SUMMARY na FINISH (postojeći
   FINISH+DISTANCE se spaja u SUMMARY).
3. **Kontrola**: postojeći mute ostaje; dodati u GuidedSessionCard mali prikaz „sledeća najava"
   (opciono, ako je jeftino) ili bar tihi režim ne menja ponašanje.
4. **E2E** `guided-audio.spec.ts`: mock `window.speechSynthesis` (addInitScript sa spy koji
   beleži `speak` pozive u `window.__spoken`) → pokreni vođenu trku → ubrzaj clock? (postojeći
   guided.spec ne ubrzava; koristi realne cue tačke koje se mogu dohvatiti odmah: BRIEF na
   startu) → assert da je BRIEF izgovoren i da posle „Preskoči" (skip) dolazi COACH linija;
   FINISH → SUMMARY sadrži distancu. Ako je vremenski nemoguće bez ubrzanja, asertuj BRIEF +
   cue na skip + mute sprečava speak.

## Van v1

Snimljeni ljudski audio, muzika u pozadini, tempo-match playlist, preuzimanje sesija offline.
