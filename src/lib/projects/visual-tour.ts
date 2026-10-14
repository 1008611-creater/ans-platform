import type { VisualTour, VisualAppearance, VisualWebsite } from "@/contracts/visual-website";
import type { ResumeWebsiteInput } from "@/contracts/resume-website";
export function createVisualTour(profile: ResumeWebsiteInput, appearance?: VisualAppearance): VisualTour {
    return { hero: { title: profile.headline, body: profile.about, byline: profile.fullName, issue: "2026", tagline: "", location: profile.location, layout: "editorial" }, nodes: profile.projects.map((project, index) => ({ id: `stop-${index}`, title: project.name, eyebrow: project.role, subtitle: "", body: project.description, url: project.url })), sections: profile.skills.length || profile.education ? [{ id: "legacy-skills", title: profile.language === "zh" ? "技能与学习" : "Skills and learning", body: [profile.skills.join(" · "), profile.education].filter(Boolean).join("\n\n"), url: "" }] : [], stickers: [], settings: { font: "sans", ambientColor: "#ffffff", keyColor: "#ffeee0", keyAngle: -35, keyHeight: 5, bloom: 0, bloomThreshold: .9, accent: appearance ? { lime: "#cafa2a", lavender: "#c3adff", coral: "#ffa891" }[appearance.palette] : "#cafa2a", text: appearance?.background === "light" ? "#242424" : "#f4f1ea", background: appearance?.background === "light" ? "#e9e9e3" : "#1c1c20", ambient: 1.2, key: 2.4, exposure: 1, fov: 24.6, vignette: 0, grayscale: 0 }, loading: { title: "", subtitle: "" } };
}
export function profileFromTour(profile: ResumeWebsiteInput, tour: VisualTour): ResumeWebsiteInput {
    return { ...profile, fullName: tour.hero.byline, headline: tour.hero.title, about: tour.hero.body, location: tour.hero.location, projects: tour.nodes.map(node => ({ name: node.title, role: node.eyebrow || node.title, description: node.body, url: node.url })).slice(0, 6) };
}
/** Every editor entry point derives the legacy save facts from the actual tour. */
export function prepareVisualDocument(document: VisualWebsite): VisualWebsite {
    const tour = document.appearance.tour ?? createVisualTour(document.profile, document.appearance);
    return { ...document, profile: profileFromTour(document.profile, tour), appearance: { ...document.appearance, avatar: "reference", tour } };
}
