import { ACHIEVEMENT_FAMILIES, type Achievement, type AchievementFamily } from '@runcast/shared';
import { Award } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeTile } from '@/components/achievements/BadgeTile';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { todayIso } from '@/lib/dates';

interface AchievementsGridProps {
  achievements: Achievement[];
  fresh?: Achievement[];
}

const POP_KEY = 'runcast.achievements.popped';

function readPopped(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(POP_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function AchievementsGrid({ achievements, fresh = [] }: AchievementsGridProps) {
  const { t } = useTranslation();
  const freshFamilies = useMemo(() => {
    const iso = todayIso();
    const popped = readPopped();
    const families = new Set(fresh.map((achievement) => achievement.family));
    for (const achievement of achievements) {
      if (achievement.unlockedAt === iso && popped[achievement.family] !== iso) families.add(achievement.family);
    }
    return families;
  }, [fresh, achievements]);

  useEffect(() => {
    const iso = todayIso();
    const popped = readPopped();
    for (const family of freshFamilies) popped[family] = iso;
    try {
      sessionStorage.setItem(POP_KEY, JSON.stringify(popped));
    } catch {
      return;
    }
  }, [freshFamilies]);

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
            <BadgeTile key={family} family={family} levels={levels} fresh={freshFamilies.has(family)} />
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
