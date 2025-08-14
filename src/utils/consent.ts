export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
  version: string;
}

export type CookieCategory = keyof Omit<CookieConsent, 'timestamp' | 'version'>;

export const CONSENT_STORAGE_KEY = 'of-tomorrow-cookie-consent';
export const CONSENT_BANNER_KEY = 'of-tomorrow-banner-dismissed';
export const CONSENT_VERSION = '1.0';

// Default consent state (only necessary cookies)
export const DEFAULT_CONSENT: CookieConsent = {
  necessary: true, // Always true as these are required for basic functionality
  analytics: false,
  marketing: false,
  timestamp: Date.now(),
  version: CONSENT_VERSION,
};

// Cookie category definitions
export const COOKIE_CATEGORIES = {
  necessary: {
    name: 'Necessary Cookies',
    description: 'Essential cookies required for the website to function properly. These cannot be disabled.',
    required: true,
    cookies: [
      'Session management cookies',
      'Security and authentication cookies',
      'Cookie consent preferences',
    ],
  },
  analytics: {
    name: 'Analytics Cookies',
    description: 'Help us understand how visitors interact with our website by collecting anonymous information.',
    required: false,
    cookies: [
      'Google Analytics (_ga, _ga_*, _gid)',
      'Performance monitoring cookies',
      'Usage statistics cookies',
    ],
  },
  marketing: {
    name: 'Marketing Cookies',
    description: 'Used to track visitors across websites to display relevant advertisements.',
    required: false,
    cookies: [
      'Meta Pixel (_fbp, _fbc)',
      'Advertising tracking cookies',
      'Social media integration cookies',
    ],
  },
} as const;

/**
 * Get current consent from localStorage
 */
export function getConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    
    const consent = JSON.parse(stored) as CookieConsent;
    
    // Check if consent version is outdated
    if (consent.version !== CONSENT_VERSION) {
      return null;
    }
    
    return consent;
  } catch {
    return null;
  }
}

/**
 * Save consent to localStorage
 */
export function saveConsent(consent: Partial<CookieConsent>): void {
  if (typeof window === 'undefined') return;
  
  const fullConsent: CookieConsent = {
    ...DEFAULT_CONSENT,
    ...consent,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };
  
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(fullConsent));
  
  // Trigger custom event for other components to react to consent changes
  window.dispatchEvent(new CustomEvent('consentUpdate', { detail: fullConsent }));
}

/**
 * Check if user has given consent for a specific category
 */
export function hasConsent(category: CookieCategory): boolean {
  const consent = getConsent();
  if (!consent) return false;
  
  return consent[category];
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): void {
  saveConsent({
    necessary: true,
    analytics: true,
    marketing: true,
  });
}

/**
 * Reject all non-necessary cookies
 */
export function rejectAllCookies(): void {
  saveConsent({
    necessary: true,
    analytics: false,
    marketing: false,
  });
}

/**
 * Check if consent banner should be shown
 */
export function shouldShowBanner(): boolean {
  if (typeof window === 'undefined') return false;
  
  const consent = getConsent();
  const bannerDismissed = localStorage.getItem(CONSENT_BANNER_KEY);
  
  return !consent && !bannerDismissed;
}

/**
 * Mark banner as dismissed (but don't save consent)
 */
export function dismissBanner(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(CONSENT_BANNER_KEY, 'true');
}

/**
 * Clear all consent data (for testing/reset purposes)
 */
export function clearConsent(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  localStorage.removeItem(CONSENT_BANNER_KEY);
  
  window.dispatchEvent(new CustomEvent('consentUpdate', { detail: null }));
}

/**
 * Initialize tracking scripts based on current consent
 */
export function initializeTracking(): void {
  if (typeof window === 'undefined') return;
  
  const consent = getConsent();
  if (!consent) return;
  
  // Initialize Google Analytics if analytics consent is given
  if (consent.analytics && import.meta.env.PUBLIC_GA_MEASUREMENT_ID) {
    initializeGoogleAnalytics();
  }
  
  // Initialize Meta Pixel if marketing consent is given
  if (consent.marketing && import.meta.env.PUBLIC_META_PIXEL_ID) {
    initializeMetaPixel();
  }
}

/**
 * Initialize Google Analytics
 */
function initializeGoogleAnalytics(): void {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.PUBLIC_GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  
  // @ts-ignore - gtag is defined by the external script
  window.dataLayer = window.dataLayer || [];
  // @ts-ignore
  function gtag(...args: any[]) {
    // @ts-ignore
    window.dataLayer.push(arguments);
  }
  // @ts-ignore
  window.gtag = gtag;
  
  // @ts-ignore
  gtag('js', new Date());
  // @ts-ignore
  gtag('config', import.meta.env.PUBLIC_GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=Strict;Secure',
  });
}

/**
 * Initialize Meta Pixel
 */
function initializeMetaPixel(): void {
  // Meta Pixel initialization code
  // @ts-ignore - Complex Meta Pixel setup that we'll suppress TypeScript for
  !function(f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ?
        n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode!.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  
  // @ts-ignore
  window.fbq('init', import.meta.env.PUBLIC_META_PIXEL_ID);
  // @ts-ignore
  window.fbq('track', 'PageView');
}