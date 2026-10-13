# Backlog — Apple WorkoutKit (native structured workouts)

Cilj: slanje strukturiranih treninga direktno u Apple Watch (WorkoutKit) umesto ručnog importa.

- **Pristup**: Capacitor plugin (Swift) koji poziva `WorkoutKit` API (`CustomWorkout` →
  `schedule`), mapa naše korake (pace targeti → `WorkoutStep` sa `SpeedRangeAlert`).
- **Preduslovi**: Apple Developer nalog, watchOS 10+, dodatne HealthKit permisije za upis
  treninga u kalendar sat-a.
- **Obim**: M-L (native kod + testiranje na uređaju; nema web fallback-a).
- **Zašto odloženo**: FIT/TCX izvoz (F18/F25) pokriva Garmin/COROS/Polar i deo Apple korisnika
  (import u treće aplikacije); WorkoutKit zahteva native rad i pravi smisao dobija uz Watch app
  (vidi `watch-app.md`).
