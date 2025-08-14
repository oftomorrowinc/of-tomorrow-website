// TypeScript definitions and utilities for GA4 tracking

export interface TrackingEvent {
  eventName: string;
  parameters?: Record<string, any>;
}

export interface ConversionEvent extends TrackingEvent {
  value?: number;
  currency?: string;
}

// Global tracking interface
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
    tracker?: EventTracker;
    trackEvent?: (eventName: string, parameters?: Record<string, any>) => void;
    trackPageView?: (pagePath: string) => void;
    updateGAConsent?: (hasAnalyticsConsent: boolean) => void;
    initializeMetaPixel?: () => void;
  }
}

export interface EventTracker {
  trackContactFormStart(): void;
  trackContactFormSubmit(method?: string): void;
  trackButtonClick(buttonText: string, buttonType?: string, location?: string): void;
  trackExternalLink(url: string, linkText?: string): void;
  trackScrollDepth(percent: number): void;
  trackFileDownload(fileName: string, fileType: string, fileSize?: number | null): void;
  trackServiceInterest(serviceName: string): void;
  trackContentEngagement(contentType: string, contentId: string, action?: string): void;
  trackEvent(eventName: string, parameters?: Record<string, any>): void;
  trackPageView(pagePath?: string): void;
  trackConversion(eventName: string, value: number, currency?: string, additionalParams?: Record<string, any>): void;
  trackBusinessEvent(eventType: string, details?: Record<string, any>): void;
  trackJourneyMilestone(milestone: string, stage: string, value?: number): void;
}

// GA4 Standard Events
export const GA4_EVENTS = {
  // Engagement Events
  CLICK: 'click',
  SCROLL: 'scroll',
  PAGE_VIEW: 'page_view',
  ENGAGEMENT_ACTION: 'engagement_action',
  
  // Lead Generation Events
  FORM_START: 'form_start',
  FORM_SUBMIT: 'form_submit',
  GENERATE_LEAD: 'generate_lead',
  
  // Content Events
  VIEW_ITEM: 'view_item',
  FILE_DOWNLOAD: 'file_download',
  VISIT_TRANSLATION_SITE: 'visit_translation_site',
  
  // Custom Business Events
  SERVICE_INTEREST: 'service_interest',
  PORTFOLIO_VIEW: 'portfolio_view',
  CONTACT_INTENT: 'contact_intent'
} as const;

// Button tracking attributes helper
export const addButtonTracking = (
  buttonText: string, 
  buttonType: string = 'cta', 
  location: string = ''
) => ({
  'data-track-type': buttonType,
  'data-track-location': location,
  'data-track-text': buttonText
});

// Enhanced tracking utilities
export class TrackingUtils {
  /**
   * Track high-value conversion events
   */
  static trackConversion(eventName: string, value: number, currency: string = 'USD', additionalParams: Record<string, any> = {}) {
    if (typeof window !== 'undefined' && window.tracker) {
      window.tracker.trackEvent(eventName, {
        value,
        currency,
        ...additionalParams
      });
    }
  }

  /**
   * Track user engagement with specific content
   */
  static trackContentEngagement(contentType: string, contentId: string, action: string = 'view') {
    if (typeof window !== 'undefined' && window.tracker) {
      window.tracker.trackEvent('content_engagement', {
        content_type: contentType,
        content_id: contentId,
        action,
        engagement_time_msec: 200
      });
    }
  }

  /**
   * Track business-specific events
   */
  static trackBusinessEvent(eventType: string, details: Record<string, any> = {}) {
    if (typeof window !== 'undefined' && window.tracker) {
      window.tracker.trackEvent(eventType, {
        event_category: 'business',
        timestamp: new Date().toISOString(),
        ...details
      });
    }
  }

  /**
   * Track user journey milestones
   */
  static trackJourneyMilestone(milestone: string, stage: string, value?: number) {
    if (typeof window !== 'undefined' && window.tracker) {
      window.tracker.trackEvent('journey_milestone', {
        milestone,
        journey_stage: stage,
        value: value || 10,
        currency: 'USD'
      });
    }
  }
}

// Conversion values for different actions (can be configured via environment variables)
export const CONVERSION_VALUES = {
  CONTACT_FORM_SUBMIT: 100,
  HIGH_VALUE_CTA_CLICK: 50,
  EXTERNAL_SITE_VISIT: 25,
  SERVICE_INQUIRY: 75,
  PORTFOLIO_VIEW: 30,
  SCROLL_COMPLETION: 5
} as const;

// Business-specific event taxonomy
export const BUSINESS_EVENTS = {
  // Lead Generation
  CONTACT_FORM_START: 'contact_form_start',
  CONTACT_FORM_SUBMIT: 'contact_form_submit',
  SERVICE_INQUIRY: 'service_inquiry',
  
  // Engagement
  CTA_CLICK: 'cta_click',
  PORTFOLIO_VIEW: 'portfolio_view',
  SERVICE_CARD_CLICK: 'service_card_click',
  
  // Navigation
  EXTERNAL_LINK_CLICK: 'external_link_click',
  TRANSLATION_SITE_VISIT: 'translation_site_visit',
  
  // Content Interaction
  SCROLL_MILESTONE: 'scroll_milestone',
  TIME_ON_PAGE: 'time_on_page',
  SECTION_VIEW: 'section_view'
} as const;

export default TrackingUtils;