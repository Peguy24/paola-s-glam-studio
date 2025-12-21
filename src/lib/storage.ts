import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for a review photo stored in the private review-photos bucket.
 * Falls back to the original URL if signing fails.
 */
export async function getSignedPhotoUrl(photoUrl: string): Promise<string> {
  // Extract the file path from the URL
  // URLs are in format: https://xxx.supabase.co/storage/v1/object/public/review-photos/path/to/file.jpg
  const match = photoUrl.match(/review-photos\/(.+)$/);
  if (!match) {
    return photoUrl; // Return original if it doesn't match expected format
  }

  const filePath = match[1];
  
  const { data, error } = await supabase.storage
    .from('review-photos')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error creating signed URL:', error);
    return photoUrl; // Fallback to original URL
  }

  return data.signedUrl;
}

/**
 * Get signed URLs for multiple review photos
 */
export async function getSignedPhotoUrls(photoUrls: string[]): Promise<string[]> {
  const signedUrls = await Promise.all(
    photoUrls.map(url => getSignedPhotoUrl(url))
  );
  return signedUrls;
}
