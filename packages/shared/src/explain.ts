import type { PaceZone, PlanPaces, PlanPhase, WorkoutType } from './types';
import { formatPace } from './vdot';

export interface ExplainInput {
  type: WorkoutType;
  phase: PlanPhase;
  paceZone: PaceZone | null;
  distanceKm: number;
}

export interface ExplainOptions {
  paces?: PlanPaces | null;
}

export interface WorkoutExplanation {
  why: string;
  how: string[];
  mistake: string;
  effort: string;
}

const TYPE_CONTENT: Record<WorkoutType, WorkoutExplanation> = {
  EASY: {
    why: 'Lagano trčanje gradi aerobnu bazu i oporavlja te između teških treninga — zato je sporo namerno.',
    how: ['Drži razgovorni tempo cele deonice.', 'Ako uletiš brže, uspori: plafon je brzina, ne cilj.'],
    mistake: '„Laki" dan na umerenom tempu (RPE 6) — tada nijedan dan nije ni lak ni težak.',
    effort: 'RPE 3–4 — pričaš u punim rečenicama bez gubljenja daha.',
  },
  LONG: {
    why: 'Gradi izdržljivost, ekonomičnost i mentalnu čvrstinu za završnicu trke.',
    how: ['Kreni mirno, prvih 5 km najsporije.', 'Hidriraj se i testiraj opremu kao na trci.'],
    mistake: 'Prebrz početak te iscedi pred kraj — trk treba da ti da samopouzdanje, ne da te slomi.',
    effort: 'RPE 4–5 (kraj do 6) — pričaš u rečenicama, dišeš kontrolisano.',
  },
  TEMPO: {
    why: 'Tempo rad podiže laktatnu barijeru — tempo koji držiš ~1 h vremenom postaje lakši.',
    how: ['Zagrevanje 2 km pa tempo blok ravnomerno, bez sursa.', 'Ako pređeš u govor u jednom slovu, preterao si.'],
    mistake: 'Tempo na 5 km brzini nije tempo — postaje VO2max sesija i traži previše oporavka.',
    effort: 'RPE 6–7 — komotno teško, govoriš u kratkim frazama.',
  },
  INTERVALS: {
    why: 'Intervali podižu VO2max — plafon aerobne snage i brzinu koju možeš da održiš.',
    how: ['Prva 1–2 ponavljanja mirnije, poslednje jako kao prvo.', 'Oporavak: lagan trk ili hod, smiri disanje.'],
    mistake: 'Prejak start → besmislen umor umesto produktivnog; rezultati opadaju iz repa u rep.',
    effort: 'RPE 8–9 — teško ali kontrolisano, tehnika se ne raspada.',
  },
  REPETITIONS: {
    why: 'Repeticije ne grade izdržljivost — bruse mehaniku, korak i ekonomičnost trčanja.',
    how: ['Svako ponavljanje brzo i opušteno, bez grča.', 'Pun oporavak pre sledećeg (hod ili lagan trk).'],
    mistake: 'R tempo kao interval: bez punog oporavka mehanika se kvari i nema stimulusa za brzinu.',
    effort: 'RPE 9 — kratko i čisto; kad tehnika padne, prekini seriju.',
  },
  REST: {
    why: 'Odmor nije pauza od treninga — adaptacija se dešava dok se telo oporavlja.',
    how: ['Šetnja, mobilnost ili lagano istezanje 15–20 min.', 'Prioritet: san 7–9 h i normalna ishrana.'],
    mistake: 'Popunjavanje dana junk kilometrima ili osećaj krivice — odmor je deo plana.',
    effort: 'RPE 0–2 — danas ne treniraš, danas se gradiš.',
  },
  RACE: {
    why: 'Dan za koji je ceo plan rađen — provera forme, taktike i glave.',
    how: ['Prvu polovinu kontrolisano, bez jurnjave za tuđim tempom.', 'Drži se svog plana tempa do kraja.'],
    mistake: 'Prebrz start sagoreva energiju — najčešći razlog pada u drugoj polovini.',
    effort: 'RPE 8–10 — jako, ali po planu; poslednja trećina sme da boli.',
  },
  STRENGTH: {
    why: 'Snaga stabilizuje zglobove i ispravlja disbalanse — manje povreda i ekonomičniji trk (+8–12% za 1–2 sesije nedeljno).',
    how: [
      'Kontrolisana forma iznad težine; zadnja 1–2 ponavljanja izazovna ali čista.',
      'Težak rad nogu ne ostavljaj za dan pre ključne trčne sesije.',
    ],
    mistake: 'Preteško i preblizu kvalitetnog trčanja — snaga tada krade oporavak umesto da ga podrži.',
    effort: 'RPE 6–8 — osećaš rad mišića, forma ostaje čista.',
  },
};

const PHASE_NOTE: Record<PlanPhase, string> = {
  BASE: 'Sada gradiš bazu i naviku — volumen raste, intenzitet ostaje nizak.',
  BUILD: 'Faza gradnje: na bazu dodajemo kvalitet i držimo rast pod kontrolom.',
  PEAK: 'Vrhunac pripreme: najzahtevniji rad, umor je očekivan i dozvoljen.',
  TAPER: 'Taper: volumen opada da bi na start stigao svež.',
  RACE: 'Sve je podređeno trci ove nedelje — dan koji je platio sav rad.',
};

const EFFORT_NOTE: Partial<Record<PlanPhase, string>> = {
  TAPER: ' Drži donji kraj raspona.',
  RACE: ' Danas je dozvoljeno sve.',
};

const ZONE_FIELDS: Record<Exclude<PaceZone, 'E'>, keyof PlanPaces> = {
  M: 'marathonSecPerKm',
  T: 'thresholdSecPerKm',
  I: 'intervalSecPerKm',
  R: 'repetitionSecPerKm',
};

function fmtKm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

function paceFor(zone: PaceZone, paces: PlanPaces): string {
  if (zone === 'E') return `${formatPace(paces.easyFastSecPerKm)}–${formatPace(paces.easySlowSecPerKm)}`;
  return formatPace(paces[ZONE_FIELDS[zone]]);
}

export function describeWorkout(input: ExplainInput, options: ExplainOptions = {}): WorkoutExplanation {
  const base = TYPE_CONTENT[input.type];
  const prefix = input.type === 'LONG' && input.distanceKm > 0 ? `Dugi trk ${fmtKm(input.distanceKm)} km — ` : '';
  const how = [...base.how];
  if (input.paceZone && options.paces) {
    how[0] = `${how[0]} (${input.paceZone} tempo ~${paceFor(input.paceZone, options.paces)} /km)`;
  }
  return {
    why: `${prefix}${base.why} ${PHASE_NOTE[input.phase]}`,
    how,
    mistake: base.mistake,
    effort: `${base.effort}${EFFORT_NOTE[input.phase] ?? ''}`,
  };
}
