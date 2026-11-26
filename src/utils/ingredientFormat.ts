export type ParsedIngredientDescription = {
  category: string | null;
  description: string;
};

/**
 * [Koku Verici] veya İşlev: Koku Verici • gibi açıklamaların başındaki
 * işlev/rol bilgisini ayrıştırarak hem şık bir rozet hem de temiz açıklama metni sunar.
 */
export function parseIngredientDescription(
  rawDescription?: string | null,
  fallbackCategory?: string | null,
): ParsedIngredientDescription {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return { category: fallbackCategory || null, description: '' };
  }

  const trimmed = rawDescription.trim();

  // 1. Köşeli parantez formatı: "[Koku Verici] Açıklama..."
  const bracketMatch = trimmed.match(/^\[(.*?)\]\s*(.*)$/s);
  if (bracketMatch) {
    return {
      category: bracketMatch[1].trim() || fallbackCategory || null,
      description: bracketMatch[2].trim(),
    };
  }

  // 2. İşlev formatı: "İşlev: Koku Verici • Açıklama..."
  const islevMatch = trimmed.match(/^İşlev:\s*([^•\n-]+?)\s*[•-]\s*(.*)$/s);
  if (islevMatch) {
    return {
      category: islevMatch[1].trim() || fallbackCategory || null,
      description: islevMatch[2].trim(),
    };
  }

  return {
    category: fallbackCategory || null,
    description: trimmed,
  };
}
