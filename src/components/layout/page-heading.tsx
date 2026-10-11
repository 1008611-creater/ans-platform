import type { ReactNode } from "react";

type PageHeadingProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  tools?: ReactNode;
  actions?: ReactNode;
};

/** Shared hierarchy for discovery, creation and member pages. */
export function PageHeading({ title, description, eyebrow, tools, actions }: PageHeadingProps) {
  return <header className={`ans-page-heading${tools ? " ans-page-heading-with-tools" : ""}`}>
    <div className="ans-page-heading-copy">
      {eyebrow && <p className="ans-eyebrow">{eyebrow}</p>}
      <h1 className="ans-page-title">{title}</h1>
      {description && <div className="ans-page-description">{description}</div>}
    </div>
    {(tools || actions) && <div className="ans-page-heading-tools">
      {tools}
      {actions && <div className="ans-page-actions">{actions}</div>}
    </div>}
  </header>;
}
