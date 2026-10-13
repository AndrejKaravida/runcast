import { ACHIEVEMENT_FAMILIES, type Achievement, type AchievementFamily } from '@runcast/shared';
import { Award } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeTile } from '@/components/achievements/BadgeTile';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface AchievementsGridProps {
  achievements: Achievement[];
}

export function AchievementsGrid({ achievements }: AchievementsGridProps) {
  const { t } = useTranslation();
  const groups = useMemo(() => {
    const byFamily = new Map<AchievementFamily, Achievement[]>();
    for (const achievement of achievements) {
      const levels = byFamily.get(achievement.family) ?? [];
      levels.push(achievement);
      byFamily.set(achievement.family, levels);
    }
    return ACHIEVEMENT_FAMILIES.map((family) => ({ family, levels: byFamily.get(family) ?? [] }));
  }, [achievements]);
  const hasEarned = achievements.some((achievement) => achievement.unlockedAt !== null);

  return (
    <div className="space-y-2" data-testid="achievements-grid">
      <SectionHeader label={t('content:achievements.title')} />
      {hasEarned ? (
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          {groups.map(({ family, levels }) => (
            <BadgeTile key={family} family={family} levels={levels} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Award className="h-6 w-6" />}
          title={t('content:achievements.emptyTitle')}
          description={t('content:achievements.emptyDescription')}
        />
      )}
    </div>
  );
}
