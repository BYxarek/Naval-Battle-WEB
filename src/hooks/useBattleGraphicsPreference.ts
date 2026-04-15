import { useEffect, useState } from 'react';
import type { BattleGraphicsStyle } from '../types';

const BATTLE_GRAPHICS_PREFERENCE_KEY = 'battle-graphics-preference';
const DEFAULT_BATTLE_GRAPHICS_STYLE: BattleGraphicsStyle = 'notebook';

export function useBattleGraphicsPreference() {
  const [battleGraphicsStyle, setBattleGraphicsStyle] = useState<BattleGraphicsStyle>(() => {
    const saved = window.localStorage.getItem(BATTLE_GRAPHICS_PREFERENCE_KEY);
    if (saved === 'notebook') {
      return saved;
    }

    return DEFAULT_BATTLE_GRAPHICS_STYLE;
  });

  useEffect(() => {
    window.localStorage.setItem(BATTLE_GRAPHICS_PREFERENCE_KEY, battleGraphicsStyle);
  }, [battleGraphicsStyle]);

  return { battleGraphicsStyle, setBattleGraphicsStyle };
}
