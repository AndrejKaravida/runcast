import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAddShoe, useDeleteShoe, useShoes, useUpdateShoe } from '@/features/gear/queries';
import { useRunLogs } from '@/features/logs/queries';
import type { ShoesRow } from '@/types';

function GearSkeleton() {
  return (
    <div data-testid="gear-skeleton" className="space-y-2">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  );
}

export function GearSection() {
  const { t } = useTranslation('settings');
  const { data: shoes = [], isLoading: shoesLoading } = useShoes();
  const { isLoading: logsLoading } = useRunLogs();
  const addShoe = useAddShoe();
  const updateShoe = useUpdateShoe();
  const deleteShoe = useDeleteShoe();

  const [name, setName] = useState('');
  const [initialKm, setInitialKm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShoesRow | null>(null);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('gear.nameRequired'));
      return;
    }
    setError(null);
    try {
      await addShoe.mutateAsync({
        name: trimmed,
        initialKm: initialKm ? Number(initialKm.replace(',', '.')) : 0,
      });
      setName('');
      setInitialKm('');
    } catch {
      setError(t('gear.saveFailed'));
    }
  }

  function handleRetire(shoe: ShoesRow) {
    setError(null);
    updateShoe.mutate({ id: shoe.id, retired: !shoe.retired }, { onError: () => setError(t('gear.saveFailed')) });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setError(null);
    try {
      await deleteShoe.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      setError(t('gear.deleteFailed'));
    }
  }

  return (
    <AppCard className="space-y-4" data-testid="gear-section">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAdd();
        }}
      >
        <AppInput label={t('gear.name')} value={name} onChange={(event) => setName(event.target.value)} />
        <AppInput
          label={t('gear.initialKm')}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          value={initialKm}
          onChange={(event) => setInitialKm(event.target.value)}
        />
        <AppButton type="submit" variant="secondary" className="w-full" loading={addShoe.isPending}>
          {t('gear.add')}
        </AppButton>
      </form>

      {shoesLoading || logsLoading ? (
        <GearSkeleton />
      ) : shoes.length === 0 ? (
        <p data-testid="gear-empty" className="text-sm text-text-muted">
          {t('gear.empty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {shoes.map((shoe) => (
            <li
              key={shoe.id}
              data-testid="shoe-row"
              className="flex items-center gap-3 rounded-xl bg-surface-elevated px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{shoe.name}</p>
                  {shoe.retired ? <AppBadge tone="neutral">{t('gear.retired')}</AppBadge> : null}
                </div>
                <p data-testid="shoe-km" className="num text-caption text-text-muted">
                  {t('gear.km', { km: shoe.totalKm.toFixed(1) })}
                </p>
              </div>
              <AppButton type="button" variant="ghost" size="sm" onClick={() => handleRetire(shoe)}>
                {shoe.retired ? t('gear.reactivate') : t('gear.retire')}
              </AppButton>
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t('gear.deleteName', { name: shoe.name })}
                onClick={() => setDeleteTarget(shoe)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </AppButton>
            </li>
          ))}
        </ul>
      )}

      <p className="text-caption text-text-muted">{t('gear.hint')}</p>

      {error ? (
        <p data-testid="gear-error" role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('gear.deleteTitle')}
        description={t('gear.deleteText', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('gear.deleteConfirm')}
        tone="danger"
        loading={deleteShoe.isPending}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </AppCard>
  );
}
