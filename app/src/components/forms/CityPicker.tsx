import { useState } from 'react';
import { searchPlaces, type Place } from '@runcast/shared';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';

interface CityPickerProps {
  city: string;
  onSelect: (place: Place) => void;
  onManualInput?: () => void;
}

export function CityPicker({ city, onSelect, onManualInput }: CityPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError(t('city.tooShort'));
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const results = await searchPlaces(trimmed);
      setPlaces(results);
      if (results.length === 0) setError(t('city.noResults'));
    } catch {
      setError(t('city.searchFailed'));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <AppInput
            label={t('city.label')}
            placeholder={t('city.placeholder')}
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
          {t('city.search')}
        </AppButton>
      </div>
      {places.length > 0 ? (
        <ul className="space-y-1">
          {places.map((place) => (
            <li key={`${place.lat}-${place.lon}`}>
              <AppButton
                type="button"
                size="sm"
                variant="secondary"
                className="w-full justify-start text-left"
                onClick={() => {
                  onSelect(place);
                  setPlaces([]);
                  setQuery('');
                }}
              >
                <span className="min-w-0 truncate">
                  {place.name}
                  <span className="font-normal text-text-muted">
                    {' '}
                    · {[place.admin1, place.country].filter(Boolean).join(', ')}
                  </span>
                </span>
              </AppButton>
            </li>
          ))}
        </ul>
      ) : null}
      {city ? (
        <p role="status" className="flex items-center gap-2 text-sm text-success-ink">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> {city}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
