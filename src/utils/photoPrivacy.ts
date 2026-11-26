import { requireOptionalNativeModule } from 'expo';

import { hasSensitivePhotoText, type PhotoFrame } from './photoPrivacyRules';

export type PreparedPhoto = { uri: string; width: number; height: number; privacyChecked: true };
type NativeInspection =
  | { hasPerson: true }
  | { hasPerson: false; text: string; uri: string; width: number; height: number };

const photoPrivacy = requireOptionalNativeModule<{
  inspect(uri: string, left: number, top: number, right: number, bottom: number): Promise<NativeInspection>;
  discard(uri: string): Promise<void>;
}>('VerinalizPhotoPrivacy');

export const supportsPhotoPrivacy = photoPrivacy !== null;

export async function discardPhoto(uri: string) {
  await photoPrivacy?.discard(uri).catch(() => {});
}

export async function inspectPhoto(uri: string, frame: PhotoFrame): Promise<
  { photo: PreparedPhoto } | { issue: 'person' | 'text' }
> {
  if (!photoPrivacy) throw new Error('On-device photo inspection is unavailable');
  const result = await photoPrivacy.inspect(uri, frame.left, frame.top, frame.right, frame.bottom);
  if (result.hasPerson) return { issue: 'person' };
  if (hasSensitivePhotoText(result.text)) {
    await discardPhoto(result.uri);
    return { issue: 'text' };
  }
  return { photo: { uri: result.uri, width: result.width, height: result.height, privacyChecked: true } };
}
