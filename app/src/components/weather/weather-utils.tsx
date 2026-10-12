import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import type { WeatherAssessment } from '@runcast/shared';

export function weatherIcon(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export interface AssessmentText {
  title: string;
  description: string;
  tone: 'rain' | 'warning' | 'danger';
}

export function assessmentText(assessment: WeatherAssessment): AssessmentText | null {
  switch (assessment.code) {
    case 'STORM':
      return {
        title: 'Grmljavina u terminu treninga',
        description: 'Predlog: prebaci trening ili odradi indoor varijantu.',
        tone: 'danger',
      };
    case 'RAIN':
      return {
        title: `Kiša — ${assessment.details.precipProbabilityPct}% šanse`,
        description: `Očekuje se do ${assessment.details.precipMm} mm u tvom terminu.`,
        tone: 'rain',
      };
    case 'HEAT':
      return {
        title: `Vruće — osećaj ${assessment.details.apparentC}°C`,
        description: 'Predlog: pomeri trening ranije ili na veče.',
        tone: 'warning',
      };
    case 'COLD':
      return {
        title: `Hladno — osećaj ${assessment.details.apparentC}°C`,
        description: 'Predlog: indoor trening ili dodatni sloj.',
        tone: 'rain',
      };
    case 'WIND':
      return {
        title: `Jak vetar — udari do ${assessment.details.windGustKmh} km/h`,
        description: 'Na otvorenom biće teže nego obično.',
        tone: 'warning',
      };
    case 'AIR':
      return {
        title: `Loš vazduh — PM2.5 ${assessment.details.pm25}`,
        description: 'Predlog: indoor ili drugi termin.',
        tone: 'warning',
      };
    default:
      return null;
  }
}
