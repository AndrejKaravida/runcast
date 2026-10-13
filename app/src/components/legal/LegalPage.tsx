import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { LEGAL_ENTITY, TERMS_VERSION } from '@/features/legal/legal';

interface LegalSection {
  id?: string;
  heading: string;
  paragraphs: string[];
}

interface LegalPageProps {
  titleKey: string;
  sectionsKey: string;
}

export function LegalPage({ titleKey, sectionsKey }: LegalPageProps) {
  const { t } = useTranslation('legal');
  const { session } = useAuth();
  const sections = t(sectionsKey, { returnObjects: true }) as unknown as LegalSection[];

  return (
    <div className="mx-auto w-full max-w-[560px] space-y-6 px-4 py-6">
      <Link to={session ? '/today' : '/login'} className="inline-block text-sm text-text-secondary hover:text-text">
        {session ? t('backToApp') : t('backToLogin')}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-display">{t(titleKey)}</h1>
        <p className="text-caption text-text-muted">
          {t('version', { version: TERMS_VERSION })} · {LEGAL_ENTITY}
        </p>
      </header>
      {sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h2 id={section.id} className="text-base font-semibold">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm text-text-secondary">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
