import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a profile picture file or blob to Firebase Storage.
 * Falls back to base64 Data URL if Firebase Storage upload fails or is offline.
 */
export async function uploadProfilePicture(
  file: File | Blob,
  userId?: string
): Promise<string> {
  const fileExt = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'jpeg';
  const fileName = `profile_${userId || 'user'}_${Date.now()}.${fileExt}`;
  const storageRef = ref(storage, `profile-pictures/${fileName}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.warn('Firebase Storage upload failed or unconfigured, converting file to base64 data URL fallback:', error);
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as Data URL'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
