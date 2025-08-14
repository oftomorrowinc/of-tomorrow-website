/**
 * Meta Pixel Helper Functions for Of Tomorrow Website
 * 
 * This file provides utility functions for working with Meta Pixel events
 * and includes test helpers for verification.
 */

import { getConsent, hasConsent } from './consent';

// Meta Pixel Event Types
export type MetaPixelStandardEvent = 
  | 'PageView'
  | 'Lead'
  | 'Contact'
  | 'ViewContent' 
  | 'Search'
  | 'InitiateCheckout'
  | 'CompleteRegistration';

export type MetaPixelCustomEvent = string;

export interface MetaPixelEventParams {
  content_name?: string;
  content_category?: string;
  content_type?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
  num_items?: number;
  source?: string;
  method?: string;
  search_string?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Enhanced Meta Pixel tracker class with type safety
 */
export class MetaPixelTracker {
  private pixelId: string;
  private isDebug: boolean;

  constructor(pixelId: string, debug = false) {
    this.pixelId = pixelId;
    this.isDebug = debug;
  }

  /**
   * Check if Meta Pixel is properly initialized
   */
  isInitialized(): boolean {
    return typeof window !== 'undefined' && 
           typeof (window as any).fbq === 'function';
  }

  /**
   * Check if user has given marketing consent
   */
  hasMarketingConsent(): boolean {
    return hasConsent('marketing');
  }

  /**
   * Track a standard Meta Pixel event
   */
  track(event: MetaPixelStandardEvent, params: MetaPixelEventParams = {}): void {
    if (!this.isInitialized() || !this.hasMarketingConsent()) {
      if (this.isDebug) {
        console.log('Meta Pixel: Skipping event (not initialized or no consent)', event, params);
      }
      return;
    }

    try {
      (window as any).fbq('track', event, params);
      
      if (this.isDebug) {
        console.log('Meta Pixel Standard Event:', event, params);
      }
    } catch (error) {
      console.error('Meta Pixel tracking error:', error);
    }
  }

  /**
   * Track a custom Meta Pixel event
   */
  trackCustom(event: MetaPixelCustomEvent, params: MetaPixelEventParams = {}): void {
    if (!this.isInitialized() || !this.hasMarketingConsent()) {
      if (this.isDebug) {
        console.log('Meta Pixel: Skipping custom event (not initialized or no consent)', event, params);
      }
      return;
    }

    try {
      (window as any).fbq('trackCustom', event, params);
      
      if (this.isDebug) {
        console.log('Meta Pixel Custom Event:', event, params);
      }
    } catch (error) {
      console.error('Meta Pixel custom tracking error:', error);
    }
  }

  /**
   * Set user data for advanced matching (GDPR compliant)
   */
  setUserData(userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }): void {
    if (!this.isInitialized() || !this.hasMarketingConsent()) {
      return;
    }

    try {
      // Prepare hashed data (Meta Pixel will hash it automatically)
      const hashedData: any = {};
      
      if (userData.email) {
        hashedData.em = userData.email.toLowerCase().trim();
      }
      
      if (userData.phone) {
        hashedData.ph = userData.phone.replace(/[^\d]/g, '');
      }
      
      if (userData.firstName) {
        hashedData.fn = userData.firstName.toLowerCase().trim();
      }
      
      if (userData.lastName) {
        hashedData.ln = userData.lastName.toLowerCase().trim();
      }
      
      if (userData.city) {
        hashedData.ct = userData.city.toLowerCase().trim();
      }
      
      if (userData.state) {
        hashedData.st = userData.state.toLowerCase().trim();
      }
      
      if (userData.zip) {
        hashedData.zp = userData.zip.replace(/[^\d]/g, '');
      }
      
      if (userData.country) {
        hashedData.country = userData.country.toLowerCase().trim();
      }

      (window as any).fbq('set', 'userData', hashedData);
      
      if (this.isDebug) {
        console.log('Meta Pixel: User data set for advanced matching');
      }
    } catch (error) {
      console.error('Meta Pixel setUserData error:', error);
    }
  }

  // Business-specific tracking methods for Of Tomorrow

  /**
   * Track lead generation (contact form, consultation request, etc.)
   */
  trackLead(source: string = 'website', value: number = 100, additionalParams: MetaPixelEventParams = {}): void {
    this.track('Lead', {
      content_name: 'Business Inquiry',
      content_category: 'lead_generation',
      value,
      currency: 'USD',
      source,
      ...additionalParams
    });

    // Also track as CompleteRegistration for conversion optimization
    this.track('CompleteRegistration', {
      content_name: 'Lead Form Completion',
      status: 'completed',
      value,
      currency: 'USD'
    });
  }

  /**
   * Track service page views or service interest
   */
  trackServiceView(serviceName: string, serviceType: string = 'business_service', value: number = 50): void {
    this.track('ViewContent', {
      content_type: 'service',
      content_ids: [serviceName.toLowerCase().replace(/\s+/g, '_')],
      content_name: serviceName,
      content_category: serviceType,
      value,
      currency: 'USD'
    });
  }

  /**
   * Track high-value actions (consultation requests, quote requests)
   */
  trackHighValueAction(actionType: string = 'consultation', value: number = 500): void {
    this.track('InitiateCheckout', {
      content_name: actionType,
      content_category: 'business_service',
      num_items: 1,
      value,
      currency: 'USD'
    });
  }

  /**
   * Track contact interactions
   */
  trackContact(method: string = 'form', value: number = 150): void {
    this.track('Contact', {
      content_name: 'Business Contact',
      content_category: 'customer_service',
      method,
      value,
      currency: 'USD'
    });
  }

  /**
   * Track search actions
   */
  trackSearch(searchTerm: string, category: string = 'site_search'): void {
    this.track('Search', {
      content_category: category,
      search_string: searchTerm,
      value: 25,
      currency: 'USD'
    });
  }

  /**
   * Track business-specific custom events
   */
  trackBusinessEvent(eventName: string, params: MetaPixelEventParams = {}): void {
    const customEventName = `OfTomorrow_${eventName}`;
    this.trackCustom(customEventName, {
      event_category: 'business_action',
      timestamp: new Date().toISOString(),
      page_url: typeof window !== 'undefined' ? window.location.href : '',
      ...params
    });
  }
}

/**
 * Get the global Meta Pixel tracker instance
 */
export function getMetaPixelTracker(): MetaPixelTracker | null {
  if (typeof window === 'undefined') return null;
  
  const pixelId = import.meta.env.PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;
  
  const isDebug = window.location.hostname === 'localhost' || 
                 window.location.hostname.includes('localhost');
  
  return new MetaPixelTracker(pixelId, isDebug);
}

/**
 * Quick tracking functions for common events
 */
export const quickTrack = {
  /**
   * Track page view with custom parameters
   */
  pageView: (customParams: MetaPixelEventParams = {}) => {
    const tracker = getMetaPixelTracker();
    if (!tracker) return;
    
    tracker.track('PageView', {
      content_name: typeof document !== 'undefined' ? document.title : '',
      content_category: 'business_website',
      page_type: 'standard',
      ...customParams
    });
  },

  /**
   * Track contact form submission
   */
  contactSubmit: (formType: string = 'contact_form', value: number = 100) => {
    const tracker = getMetaPixelTracker();
    if (!tracker) return;
    
    tracker.trackLead(formType, value);
  },

  /**
   * Track button/CTA clicks
   */
  ctaClick: (ctaText: string, location: string = '', value: number = 50) => {
    const tracker = getMetaPixelTracker();
    if (!tracker) return;
    
    tracker.trackBusinessEvent('CTAClick', {
      cta_text: ctaText,
      cta_location: location,
      value,
      currency: 'USD'
    });

    // High-value CTAs trigger InitiateCheckout
    const highValueCTAs = [
      'Start a Conversation',
      'Schedule Consultation', 
      'Request Quote',
      'Get Started',
      'Contact Us'
    ];

    if (highValueCTAs.includes(ctaText)) {
      tracker.trackHighValueAction('cta_interaction', 200);
    }
  },

  /**
   * Track service interest
   */
  serviceInterest: (serviceName: string, serviceType: string = 'business_service') => {
    const tracker = getMetaPixelTracker();
    if (!tracker) return;
    
    tracker.trackServiceView(serviceName, serviceType, 75);
    tracker.trackBusinessEvent('ServiceInterest', {
      service_name: serviceName,
      service_type: serviceType,
      engagement_level: 'interested',
      value: 75,
      currency: 'USD'
    });
  },

  /**
   * Track file downloads
   */
  fileDownload: (fileName: string, fileType: string) => {
    const tracker = getMetaPixelTracker();
    if (!tracker) return;
    
    tracker.trackBusinessEvent('FileDownload', {
      file_name: fileName,
      file_type: fileType,
      value: 30,
      currency: 'USD'
    });
  },

  /**
   * Track external link clicks
   */
  externalLink: (url: string, linkText: string = '') => {
    const tracker = getMetaPixelTracker();
    if (!tracker) return;
    
    tracker.trackBusinessEvent('ExternalLink', {
      link_url: url,
      link_text: linkText,
      link_domain: new URL(url).hostname
    });
  }
};

/**
 * Test helper functions for verification
 */
export const testHelpers = {
  /**
   * Check if Meta Pixel is properly loaded and initialized
   */
  checkPixelStatus: (): { 
    loaded: boolean; 
    pixelId: string | null; 
    consent: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];
    const pixelId = import.meta.env.PUBLIC_META_PIXEL_ID;
    
    if (!pixelId) {
      errors.push('PUBLIC_META_PIXEL_ID not found in environment variables');
    }

    const loaded = typeof window !== 'undefined' && 
                  typeof (window as any).fbq === 'function';
    
    if (!loaded) {
      errors.push('Meta Pixel (fbq) function not found - pixel may not be loaded');
    }

    const consent = hasConsent('marketing');
    
    if (!consent) {
      errors.push('Marketing consent not granted - Meta Pixel will not track events');
    }

    return {
      loaded,
      pixelId,
      consent,
      errors
    };
  },

  /**
   * Send test events to verify tracking
   */
  sendTestEvents: (): void => {
    const tracker = getMetaPixelTracker();
    if (!tracker) {
      console.error('Meta Pixel tracker not available');
      return;
    }

    console.log('Sending Meta Pixel test events...');

    // Test standard events
    tracker.track('PageView', { content_name: 'Test Page View' });
    tracker.trackLead('test_form', 100);
    tracker.trackServiceView('Test Service', 'test_service');
    tracker.trackContact('test_contact');
    tracker.trackSearch('test search term');

    // Test custom events
    tracker.trackBusinessEvent('TestEvent', {
      test_parameter: 'test_value',
      value: 50,
      currency: 'USD'
    });

    console.log('Test events sent. Check Meta Events Manager for verification.');
  },

  /**
   * Log current tracking configuration
   */
  logConfiguration: (): void => {
    const status = testHelpers.checkPixelStatus();
    const consent = getConsent();
    
    console.group('Meta Pixel Configuration');
    console.log('Pixel Status:', status);
    console.log('Current Consent:', consent);
    console.log('Environment:', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      pixelId: import.meta.env.PUBLIC_META_PIXEL_ID,
      debug: typeof window !== 'undefined' && window.location.hostname === 'localhost'
    });
    console.groupEnd();
  },

  /**
   * Validate event parameters
   */
  validateEventParams: (eventName: string, params: MetaPixelEventParams): {
    valid: boolean;
    warnings: string[];
    suggestions: string[];
  } => {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for required parameters based on event type
    if (eventName === 'Lead' || eventName === 'CompleteRegistration') {
      if (!params.value) {
        warnings.push('Lead events should include a value for conversion optimization');
      }
      if (!params.currency) {
        suggestions.push('Consider adding currency parameter (e.g., "USD")');
      }
    }

    if (eventName === 'ViewContent') {
      if (!params.content_type) {
        warnings.push('ViewContent events should include content_type');
      }
      if (!params.content_ids || params.content_ids.length === 0) {
        warnings.push('ViewContent events should include content_ids array');
      }
    }

    if (eventName === 'InitiateCheckout') {
      if (!params.value) {
        warnings.push('InitiateCheckout events should include a value');
      }
      if (!params.num_items) {
        suggestions.push('Consider adding num_items parameter');
      }
    }

    // General suggestions
    if (!params.content_name) {
      suggestions.push('Adding content_name helps with event identification');
    }

    if (!params.content_category) {
      suggestions.push('Adding content_category helps with campaign optimization');
    }

    return {
      valid: warnings.length === 0,
      warnings,
      suggestions
    };
  }
};

// Development-only debugging functions
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Make test helpers available globally for debugging
  (window as any).metaPixelHelpers = {
    tracker: getMetaPixelTracker(),
    quickTrack,
    testHelpers
  };
}