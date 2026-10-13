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
import i18n from '@/i18n';

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
        title: i18n.t('workout:assessment.storm.title'),
        description: i18n.t('workout:assessment.storm.description'),
        tone: 'danger',
      };
    case 'RAIN':
      return {
        title: i18n.t('workout:assessment.rain.title', { pct: assessment.details.precipProbabilityPct }),
        description: i18n.t('workout:assessment.rain.description', { mm: assessment.details.precipMm }),
        tone: 'rain',
      };
    case 'HEAT':
      return {
        title: i18n.t('workout:assessment.heat.title', { temp: assessment.details.apparentC }),
        description: i18n.t('workout:assessment.heat.description'),
        tone: 'warning',
      };
    case 'COLD':
      return {
        title: i18n.t('workout:assessment.cold.title', { temp: assessment.details.apparentC }),
        description: i18n.t('workout:assessment.cold.description'),
        tone: 'rain',
      };
    case 'WIND':
      return {
        title: i18n.t('workout:assessment.wind.title', { gust: assessment.details.windGustKmh }),
        description: i18n.t('workout:assessment.wind.description'),
        tone: 'warning',
      };
    case 'AIR':
      return {
        title: i18n.t('workout:assessment.air.title', { pm25: assessment.details.pm25 }),
        description: i18n.t('workout:assessment.air.description'),
        tone: 'warning',
      };
    default:
      return null;
  }
}
