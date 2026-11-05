export const riskLabels = {
  safe: 'Düşük Endişe',
  controversial: 'Tartışmalı',
  dangerous: 'Yüksek Endişe',
} as const;

export type AdditiveRisk = keyof typeof riskLabels;
