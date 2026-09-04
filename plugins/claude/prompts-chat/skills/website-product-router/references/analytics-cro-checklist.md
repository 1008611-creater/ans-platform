# Analytics CRO Checklist

Use when a site captures leads, sales, signups, bookings, activation, uploads, or traffic.

## Required Decisions

- Primary conversion.
- Secondary conversions.
- Analytics provider.
- Form/CTA destination.
- Funnel event names.
- Event taxonomy owner and destination.
- Experiment hypothesis, variants, success metric, and guardrail metric when CRO testing is requested.
- Consent/cookie requirements for the target market.

## Verification

- Tracking script and provider configuration are present.
- Key events are wired or explicitly marked not done.
- Form submission path is tested or marked blocked.
- CTA target works.
- Experiment assignment/firing is checked when GrowthBook/PostHog-style testing is used.
- `analytics_gate`, `cro_gate`, and `experimentation_gate` have matching verification records before pass.
- Privacy/consent requirements are considered when relevant.

Do not claim analytics/CRO completion without a verified event path or a clear not-done record.
