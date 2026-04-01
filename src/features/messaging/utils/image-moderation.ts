export type ImageScanResult = {
  passed: boolean;
  reason?: string;
};

// TODO: Replace with real image-scanner integration when #318 (platform-wide content moderation) lands.
// The moderation system will provide `scanImage` via the content moderation service.
// This stub always passes — wire it to the real scanner without changing the call sites.
export async function scanImage(_buffer: Buffer): Promise<ImageScanResult> {
  return { passed: true };
}
