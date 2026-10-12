import { useState } from 'react';
import { searchPlaces, type Place } from '@runcast/shared';
import { CheckCircle2 } from 'lucide-react';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';

interface CityPickerProps {
  city: string;
  onSelect: (place: Place) => void;
  onManualInput?: () => void;
}

export function CityPicker({ city, onSelect, onManualInput }: CityPickerProps) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError('Ukucaj bar 2 znaka naziva grada');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const results = await searchPlaces(trimmed);
      setPlaces(results);
      if (results.length === 0) setError('Nema rezultata — probaj drugi naziv');
    } catch {
      setError('Pretraga trenutno ne radi — probaj kasnije');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <AppInput
            label="Grad"
            placeholder="Novi Sad"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onManualInput?.();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSearch();
              }
            }}
          />
        </div>
        <AppButton type="button" variant="secondary" onClick={() => void handleSearch()} loading={searching}>
          Traži
        </AppButton>
      </div>
      {places.length > 0 ? (
        <ul className="space-y-1">
          {places.map((place) => (
            <li key={`${place.lat}-${place.lon}`}>
              <button
                type="button"
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-left text-sm hover:border-primary/50"
                onClick={() => {
                  onSelect(place);
                  setPlaces([]);
                  setQuery('');
                }}
              >
                {place.name}
                <span className="text-text-muted"> · {[place.admin1, place.country].filter(Boolean).join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {city ? (
        <p className="flex items-center gap-2 text-sm text-success-ink">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> {city}
        </p>
      ) : null}
      {error ? <p className="text-xs text-danger-ink">{error}</p> : null}
    </div>
  );
}
