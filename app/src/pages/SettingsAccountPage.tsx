import { useState } from 'react';
import { Download, FileText, LogOut, Scale, ShieldCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { downloadAccountData } from '@/features/account/export';
import { useDeleteAccount } from '@/features/account/queries';

const DELETE_LIST_KEYS = ['profile', 'plan', 'logs', 'shoes', 'avatar', 'notifications'] as const;

export function SettingsAccountPage() {
  const { session, signOut } = useAuth();
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const deleteAccount = useDeleteAccount();

  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const email = session?.user.email ?? '';

  async function handleExport() {
    setExportNotice(null);
    setExportError(null);
    setExporting(true);
    try {
      await downloadAccountData();
      setExportNotice(t('account.exportDone'));
    } catch {
      setExportError(t('account.exportFailed'));
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteAccount.mutateAsync();
      navigate('/login', { replace: true });
    } catch {
      setDeleteError(t('account.deleteFailed'));
    }
  }

  return (
    <SettingsSubpage title={t('account.label')}>
      <AppCard>
        <p className="break-all text-sm font-medium">{email}</p>
        <p className="text-caption text-text-muted">{t('account.emailHint')}</p>
      </AppCard>

      <section className="space-y-2">
        <SectionHeader label={t('account.legalGroup')} />
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <SettingsRow to="/privacy" icon={ShieldCheck} label={t('legal:privacyTitle')} />
          <SettingsRow to="/terms" icon={FileText} label={t('legal:termsTitle')} />
          <SettingsRow to="/licenses" icon={Scale} label={t('licenses:title')} />
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader label={t('account.dataGroup')} />
        <AppCard className="space-y-3">
          <AppButton variant="secondary" className="w-full" loading={exporting} onClick={() => void handleExport()}>
            <Download className="h-4 w-4" aria-hidden /> {t('account.exportButton')}
          </AppButton>
          <p className="text-caption text-text-muted">{t('account.exportHint')}</p>
        </AppCard>
        {exportNotice ? (
          <p
            role="status"
            className="rounded-xl border border-success/40 bg-success-soft px-3 py-2 text-sm text-success-ink"
          >
            {exportNotice}
          </p>
        ) : null}
        {exportError ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger-ink"
          >
            {exportError}
          </p>
        ) : null}
      </section>

      <AppCard className="space-y-3 border-danger/40">
        <p className="text-sm font-medium text-danger-ink">{t('account.deleteTitle')}</p>
        <div className="space-y-1">
          <p className="text-sm text-text-secondary">{t('account.deleteWarning')}</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-text-secondary">
            {DELETE_LIST_KEYS.map((key) => (
              <li key={key}>{t(`account.deleteList.${key}`)}</li>
            ))}
          </ul>
          <p className="text-sm text-text-secondary">{t('account.deleteIrreversible')}</p>
        </div>
        <AppButton variant="danger" className="w-full" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" aria-hidden /> {t('account.deleteButton')}
        </AppButton>
      </AppCard>

      <AppButton
        variant="danger"
        size="sm"
        className="self-start"
        onClick={() => {
          void signOut();
        }}
      >
        <LogOut className="h-4 w-4" aria-hidden /> {t('account.signOut')}
      </AppButton>

      <ConfirmDialog
        open={confirmOpen}
        title={t('account.deleteTitle')}
        description={t('account.deleteIrreversible')}
        confirmLabel={t('account.deleteButton')}
        confirmText={t('account.deleteConfirmLabel')}
        confirmHint={t('account.deleteConfirmHint')}
        tone="danger"
        loading={deleteAccount.isPending}
        error={deleteError ?? undefined}
        onConfirm={() => void handleDelete()}
        onClose={() => {
          setConfirmOpen(false);
          setDeleteError(null);
        }}
      />
    </SettingsSubpage>
  );
}
