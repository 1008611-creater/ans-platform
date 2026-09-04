# Project Intake

Ask only what blocks routing. For non-technical users, infer reasonable defaults.

## Minimum Questions

1. Is this a website, mini program, H5, or app/dashboard?
2. What is the business goal: leads, sales, brand, booking, content, tool use, or internal operation?
3. Who uses it?
4. Does it need to go live fast, or does it need source-code ownership?
5. Does it need login, payment, upload, database/cloud database, backend APIs, or admin?

## Defaults

- Unknown public marketing site: start with website route and design subroute.
- Unknown mini program: start with page flow, runtime stack decision, data/backend/admin needs, and DevTools verification path.
- User asks "高级感/设计感/网感": route through `frontend-product-design-router` and aesthetic gate before visual production.
- User is non-technical: return one recommended route plus one fallback, not a tool menu.
