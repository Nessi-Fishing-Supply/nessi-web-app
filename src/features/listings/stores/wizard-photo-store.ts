import { idbGetAll, idbPut, idbDelete, idbClear } from '@/libs/indexed-db';

const STORE_NAME = 'wizard-photos';

export interface WizardPhoto {
  id: string;
  file: File | null;
  position: number;
  previewUrl: string;
}

export async function getWizardPhotos(): Promise<WizardPhoto[]> {
  try {
    const photos = await idbGetAll<WizardPhoto>(STORE_NAME);
    return photos.sort((a, b) => a.position - b.position);
  } catch {
    return [];
  }
}

export async function addWizardPhoto(file: File, position: number): Promise<WizardPhoto> {
  const id = crypto.randomUUID();
  const previewUrl = URL.createObjectURL(file);
  const photo: WizardPhoto = { id, file, position, previewUrl };
  await idbPut(STORE_NAME, photo);
  return photo;
}

export async function removeWizardPhoto(id: string): Promise<void> {
  await idbDelete(STORE_NAME, id);
}

export async function reorderWizardPhotos(photos: WizardPhoto[]): Promise<void> {
  for (let i = 0; i < photos.length; i++) {
    const updated = { ...photos[i], position: i };
    await idbPut(STORE_NAME, updated);
  }
}

export async function clearWizardPhotos(): Promise<void> {
  await idbClear(STORE_NAME);
}
