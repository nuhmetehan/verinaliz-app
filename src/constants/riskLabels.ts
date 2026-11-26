import { colors } from '@/theme/theme';

export const riskLabels = {
  safe: 'Düşük Endişe',
  controversial: 'Tartışmalı',
  dangerous: 'Yüksek Endişe',
} as const;

export type AdditiveRisk = keyof typeof riskLabels;

export function getAdditiveRiskBadge(risk?: AdditiveRisk | null) {
  switch (risk) {
    case 'dangerous':
      return { label: riskLabels.dangerous, color: colors.risk.high, bg: colors.riskSurface.high };
    case 'controversial':
      return { label: riskLabels.controversial, color: colors.risk.medium, bg: colors.riskSurface.medium };
    case 'safe':
      return { label: riskLabels.safe, color: colors.risk.safe, bg: colors.riskSurface.safe };
    default:
      return null;
  }
}
