# Website Experience Contract

Use this compact contract before visual/motion implementation, or as an audit record for an existing page. Keep unknown values marked `[待确认]`.

```markdown
# Website Experience Contract

## Product
- Project and page scope:
- Audience:
- Primary business/user goal:
- Primary CTA and success evidence:
- Stack/source repository:

## Visual Direction
- First impression:
- Visual protagonist and approximate visual weight:
- Secondary information and approximate visual weight:
- Typography, palette, material, image/video/3D role:
- Explicitly avoid:

## Information Hierarchy
| Section | User question answered | Primary content | CTA/state | Priority |
|---|---|---|---|---|

## Motion Budget
- Level: light / guided / immersive / interactive
- Why motion is needed:
- Desktop only / shared / mobile-specific behavior:
- Reduced-motion behavior:

## Motion Inventory
| Area | Purpose | Trigger | Initial -> end state | Duration/ease | Technique | Assets | Cleanup owner | Mobile/reduced-motion fallback | Failure to avoid |
|---|---|---|---|---|---|---|---|---|---|

## Asset Registry
| Asset | State: existing/user/AI/procure | Format/spec | Used by | Source/rights | Fallback |
|---|---|---|---|---|---|

## Performance And Accessibility
- Target devices/network:
- Loading, poster, skeleton, or static fallback:
- Asset/animation concurrency limit:
- Keyboard, focus, touch, and media controls:
- Route/unmount disposal requirements:

## Decisions
- Confirmed:
- [待确认]:
- Must not change:

## Verification
- Desktop browser:
- Mobile browser:
- Reduced motion:
- Media/loading:
- Interaction/keyboard:
- Performance:
- Verified vs unverified:
```

## Handoff Rules

- State one implementation owner for each effect.
- Give concrete element roles and stable selectors/components; do not describe effects only as “高级感” or “更有动感”.
- Specify whether the effect changes layout, whether it is reversible, and how it fails gracefully.
- Keep media, 3D, Canvas, and route-lifecycle teardown explicit.
- Treat an animation plan as a specification, not as evidence that implementation or browser QA has occurred.
