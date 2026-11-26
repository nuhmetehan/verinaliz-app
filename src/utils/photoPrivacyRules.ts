export type PhotoFrame = { left: number; top: number; right: number; bottom: number };
export type FrameEdge = keyof PhotoFrame;

export const initialPhotoFrame: PhotoFrame = { left: 0.07, top: 0.07, right: 0.93, bottom: 0.93 };

export function moveFrameEdge(frame: PhotoFrame, edge: FrameEdge, delta: number): PhotoFrame {
  const minWidth = 0.2;
  const bounds: Record<FrameEdge, [number, number]> = {
    left: [0, frame.right - minWidth],
    top: [0, frame.bottom - minWidth],
    right: [frame.left + minWidth, 1],
    bottom: [frame.top + minWidth, 1],
  };
  const [min, max] = bounds[edge];
  return { ...frame, [edge]: Math.min(max, Math.max(min, frame[edge] + delta)) };
}

function validTurkishId(value: string) {
  const digits = Array.from(value, Number);
  const [a, b, c, d, e, f, g, h, i, j, k] = digits;
  const odd = a + c + e + g + i;
  const even = b + d + f + h;
  return j === (((odd * 7 - even) % 10) + 10) % 10 && k === (odd + even + j) % 10;
}

function validCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').split('').reverse().map(Number);
  const total = digits.reduce((sum, digit, index) => {
    const doubled = digit * 2;
    return sum + (index % 2 === 0 ? digit : doubled > 9 ? doubled - 9 : doubled);
  }, 0);
  return digits.some(digit => digit !== 0) && total % 10 === 0;
}

export function hasSensitivePhotoText(text: string) {
  const normalized = text.toLocaleLowerCase('tr-TR').replaceAll('ı', 'i')
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ');
  if (/\b(?:kimlik\s*(?:karti|no(?:su|numarasi)?|numarasi)|tckn|nufus cuzdani|identity card|pasaport|passport|surucu belgesi|driving licen[cs]e|hasta (?:adi|no|numarasi)|sigortali adi)\b/.test(normalized)) return true;
  if (/\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/.test(normalized)) return true;
  if (/\btr(?:[ -]?\d){24}\b/.test(normalized)) return true;
  if (/(?:^|[^\d])(?:\+90[ .-]*|0090[ .-]*|0[ .-]*)?\(?[2-5]\d{2}\)?[ .-]*\d{3}(?:[ .-]*\d{2}){2}(?!\d)/.test(normalized)) return true;
  if (/\b(?:adres(?:i)?\s*:\s*[^,]{3,}|(?:mahallesi|\bmah\.|sokak|\bsok\.|caddesi|\bcad\.)\s*(?:,?\s*)?(?:no\.?|apartman|kat|daire)\b)/.test(normalized)) return true;
  if ((normalized.match(/\b(?:\d[ -]?){14,18}\d\b/g) ?? []).some(validCardNumber)) return true;
  return (normalized.match(/\b[1-9]\d{10}\b/g) ?? []).some(validTurkishId);
}
