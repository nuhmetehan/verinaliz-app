import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion() {
  // Hareket tercihi öğrenilene kadar animasyonları kapalı tut.
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    let active = true;
    let receivedChange = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      receivedChange = true;
      if (active) setReducedMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active && !receivedChange) setReducedMotion(enabled);
    }).catch(() => { /* Tercih okunamazsa hareketi kapalı tut. */ });
    return () => { active = false; subscription.remove(); };
  }, []);

  return reducedMotion;
}
