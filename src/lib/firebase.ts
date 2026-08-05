import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCOb5OWVP_ZGoEI1KpFvivj7rf2KfKOuDo",
  authDomain: "palapitta-8b18f.firebaseapp.com",
  projectId: "palapitta-8b18f",
  storageBucket: "palapitta-8b18f.firebasestorage.app",
  messagingSenderId: "14392240197",
  appId: "1:14392240197:web:5d90be8c702818e9009b2c",
  measurementId: "G-E0Z733BVCH"
};

// Initialize Firebase App
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

/**
 * Ensures phone number has an international country code prefix (defaults to +91 for India).
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (phone.startsWith('+')) {
    return phone.trim();
  }
  return `+${cleaned}`;
}

/**
 * Initializes or resets Firebase RecaptchaVerifier on a container element ID.
 */
export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (typeof window === 'undefined') {
    throw new Error('RecaptchaVerifier can only be created in the browser.');
  }

  // Clear existing instance on the container if any
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  return new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved — allow signInWithPhoneNumber.
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
    },
  });
}

/**
 * Triggers Firebase Phone OTP SMS to the given phone number.
 */
export async function sendFirebaseOtp(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const formatted = formatPhoneNumber(phoneNumber);
  return await signInWithPhoneNumber(firebaseAuth, formatted, appVerifier);
}

/**
 * Verifies the 6-digit OTP code entered by the user.
 */
export async function verifyFirebaseOtp(
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<UserCredential> {
  return await confirmationResult.confirm(otpCode.trim());
}
