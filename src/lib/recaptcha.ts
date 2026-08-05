declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeEn3YtAAAAAFBizXHF63GhMtt9IoXTtAbXDjfe';

/**
 * Executes Google reCAPTCHA Enterprise verification and returns the token for the given action.
 */
export async function getRecaptchaEnterpriseToken(action: string = 'submit'): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    try {
      if (window.grecaptcha?.enterprise) {
        window.grecaptcha.enterprise.ready(async () => {
          try {
            const token = await window.grecaptcha!.enterprise!.execute(RECAPTCHA_SITE_KEY, { action });
            resolve(token);
          } catch (err) {
            console.warn('[reCAPTCHA Enterprise execution error]:', err);
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
    } catch (err) {
      console.warn('[reCAPTCHA error]:', err);
      resolve(null);
    }
  });
}
