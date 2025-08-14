# Google Analytics 4 Implementation Guide

## Overview

The Of Tomorrow website now includes a comprehensive GA4 implementation with GDPR-compliant consent management, enhanced event tracking, and conversion measurement optimized for business websites.

## Implementation Features

### ✅ Core GA4 Setup
- **Consent Mode v2**: Fully compliant with GDPR requirements
- **Enhanced Ecommerce**: Configured for business lead tracking
- **Cross-domain tracking**: Ready for multi-site analytics
- **Debug mode**: Development-friendly logging

### ✅ Event Tracking Capabilities

#### Automatic Events
- **Page views**: After consent granted
- **Scroll depth**: 25%, 50%, 75%, 100% milestones
- **External link clicks**: Automatic detection and tracking
- **File downloads**: PDF, docs, spreadsheets, etc.
- **Button clicks**: All buttons with tracking attributes

#### Business-Specific Events
- **Contact form interactions**: Start and submit tracking
- **Service interest**: Service card clicks with categorization
- **Lead generation**: High-value conversion tracking
- **Journey milestones**: User progression tracking
- **Content engagement**: Section views and interactions

### ✅ Conversion Tracking
- **Contact Intent**: $100 USD value
- **High-Value CTA Clicks**: $50 USD value
- **External Site Visits**: $25 USD value
- **Service Inquiries**: $75 USD value
- **Portfolio Views**: $30 USD value

## Setup Instructions

### 1. Configure GA4 Measurement ID

Update your `.env` file with your actual GA4 Measurement ID:

```bash
# Replace with your actual GA4 Measurement ID
PUBLIC_GA_MEASUREMENT_ID=G-YOUR-MEASUREMENT-ID
```

**How to get your Measurement ID:**
1. Go to Google Analytics 4
2. Navigate to Admin > Data Streams
3. Select your Web stream
4. Copy the Measurement ID (format: G-XXXXXXXXXX)

### 2. Verify Implementation

#### In Browser DevTools
1. Open your website in a browser
2. Accept analytics cookies when prompted
3. Open DevTools (F12) > Console
4. Look for "GA4 Event:" logs during interactions
5. Check Network tab for `gtag/js` and `collect` requests

#### In GA4 DebugView
1. Access your GA4 property
2. Go to Admin > DebugView
3. Add `?_debug=1` to your site URL
4. Interact with site elements
5. Verify events appear in real-time

### 3. Test Checklist

- [ ] Scripts load only after consent
- [ ] Consent mode properly configured
- [ ] All button events fire with parameters
- [ ] Values passed for conversions
- [ ] No console errors
- [ ] DebugView shows all events
- [ ] Real-time reports working

## Event Taxonomy

### Standard Events
```javascript
// Page engagement
page_view, scroll, click

// Forms
form_start, form_submit, generate_lead

// Content
view_item, content_engagement, section_view

// Business-specific
engagement_action, visit_translation_site, journey_milestone
```

### Custom Parameters
```javascript
{
  // Standard parameters
  page_title: "Page Title",
  page_location: "https://example.com",
  page_path: "/path",
  timestamp: "2025-01-14T16:25:00.000Z",
  
  // Event-specific parameters
  button_text: "Start a Conversation",
  button_type: "primary-cta",
  click_location: "hero",
  service_name: "Apps & Software",
  engagement_time_msec: 200,
  
  // Conversion parameters
  value: 100.00,
  currency: "USD",
  source: "contact_form"
}
```

## Usage Examples

### Manual Event Tracking
```javascript
// Track custom business event
window.tracker.trackBusinessEvent('newsletter_signup', {
  source: 'footer',
  user_type: 'returning'
});

// Track conversion
window.tracker.trackConversion('purchase_intent', 150, 'USD', {
  product: 'consulting_package'
});

// Track content engagement
window.tracker.trackContentEngagement('blog', 'ga4-setup-guide', 'read');
```

### Button Tracking Attributes
```html
<button 
  data-track-type="primary-cta"
  data-track-location="hero"
  data-track-text="Get Started"
>
  Get Started
</button>
```

## Advanced Configuration

### Enhanced Conversions
The implementation is ready for enhanced conversions. To enable:

1. Go to GA4 > Admin > Conversions
2. Select your conversion event
3. Enable "Enhanced conversions"
4. Configure customer data collection

### Cross-Domain Tracking
For tracking across multiple domains (e.g., translations.oftomorrow.net):

```javascript
gtag('config', 'GA_MEASUREMENT_ID', {
  linker: {
    domains: ['oftomorrow.net', 'translations.oftomorrow.net']
  }
});
```

### Custom Audiences
Create audiences based on tracked events:
- High-intent users (contact_intent events)
- Service interest segments (service-specific events)
- Engagement levels (scroll depth, time on page)

## Compliance Features

### GDPR Compliance
- ✅ Consent required before tracking
- ✅ Granular consent categories
- ✅ Data minimization principles
- ✅ User control over data collection

### Privacy Controls
- IP anonymization enabled
- Secure cookie flags (SameSite=Strict)
- 2-year cookie expiration
- Consent mode v2 implementation

## Troubleshooting

### Common Issues

**Events not appearing in GA4:**
- Check if analytics consent is granted
- Verify Measurement ID is correct
- Check for console errors
- Ensure gtag script loaded

**Consent not working:**
- Clear localStorage and cookies
- Check consent banner implementation
- Verify consent update events

**Double-counting events:**
- Check for duplicate tracking code
- Verify event listeners aren't attached multiple times

### Debug Commands
```javascript
// Check consent status
console.log(window.tracker);

// Manual event test
window.tracker.trackEvent('test_event', {test: true});

// Check GA4 configuration
console.log(window.gtag);
```

## Performance Considerations

- Lazy loading of tracking scripts
- Minimal impact on Core Web Vitals
- Efficient event batching
- Conditional script loading based on consent

## Reporting Setup

### Recommended Custom Reports
1. **Conversion Funnel**: Page views → Service interest → Contact intent
2. **Content Engagement**: Section views, scroll depth, time on page
3. **Business Performance**: Lead quality, conversion values, attribution

### Key Metrics to Monitor
- Contact form conversion rate
- Service interest by category
- User journey progression
- High-value action completion

---

## Implementation Complete ✓

Your GA4 setup is now fully configured with:
- Consent Mode v2 compliance
- Comprehensive event tracking
- Business-specific conversions
- Enhanced debugging capabilities
- Future-ready architecture

Ready for production use!