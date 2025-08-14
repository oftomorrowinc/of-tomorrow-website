// Global type declarations for tracking scripts and consent management

interface Window {
  // Google Analytics
  gtag?: (...args: any[]) => void;
  dataLayer?: any[];
  initializeGoogleAnalytics?: () => void;
  
  // Meta Pixel
  fbq?: (...args: any[]) => void;
  _fbq?: any;
  initializeMetaPixel?: () => void;
  
  // Custom tracking functions
  trackEvent?: (eventName: string, parameters?: Record<string, any>) => void;
  trackPageView?: (pagePath: string) => void;
}

// Consent-related custom events
interface WindowEventMap {
  consentUpdate: CustomEvent<import('../utils/consent').CookieConsent | null>;
  openCookieSettings: CustomEvent<void>;
}