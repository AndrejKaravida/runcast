import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { Avatar } from '@/components/ui/Avatar';
import { canUploadAvatar } from '@/features/profile/avatar';
import { useUploadAvatar } from '@/features/profile/queries';

interface AvatarUploadProps {
  avatarUrl: string | null;
  displayName: string | null;
}

export function AvatarUpload({ avatarUrl, displayName }: AvatarUploadProps) {
  const { t } = useTranslation('settings');
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!canUploadAvatar(file)) {
      setError(t('profile.avatarInvalid'));
      return;
    }
    try {
      await uploadAvatar.mutateAsync(file);
    } catch {
      setError(t('profile.avatarUploadFailed'));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Avatar src={avatarUrl} name={displayName} className="h-16 w-16 text-lg" />
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          loading={uploadAvatar.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {t('profile.changeAvatar')}
        </AppButton>
        <input
          ref={inputRef}
          data-testid="avatar-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-caption text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
