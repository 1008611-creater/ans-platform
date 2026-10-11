import { describe, expect, it } from "vitest";
import { agriCsv, agriCsvCell } from "@/domain/competitions/agri-works-export";
import { agriWorksExportQuerySchema } from "@/contracts/agri-submissions";
describe("works snapshot CSV", () => {
  it.each(["=SUM(A1:A2)", "+1", "-2", "@run", "  =1", "\uFEFF=1", "\tvalue", "\rvalue", "\nvalue"])("neutralizes spreadsheet execution prefix %j", value => {
    expect(agriCsvCell(value)).toBe('"\'' + value + '"');
  });
  it("preserves commas, embedded quotes, Chinese, emoji and multiline text within one cell", () => {
    expect(agriCsvCell('农客松, "作品" 🦖\n第二行')).toBe('"农客松, ""作品"" 🦖\n第二行"');
    expect(agriCsvCell(null)).toBe('""'); expect(agriCsvCell(13)).toBe('"13"');
    expect(agriCsvCell("https://example.invalid/repo")).toBe('"https://example.invalid/repo"');
  });
  it("emits a UTF8 marker and CRLF rows including the final row", () => {
    expect(agriCsv([["source", "scope"], ["ANS", null]])).toBe('\uFEFF"source","scope"\r\n"ANS",""\r\n');
  });
  it("exports a strict full filter scope instead of accepting a UI cursor", () => {
    expect(agriWorksExportQuerySchema.parse({ q: "  Team  " })).toEqual({ q: "Team", status: "ANY", mode: "metadata" });
    for (const extra of [{ cursor: "page" }, { scope: "staff" }, { private: true }, { stage: "ALL" }]) expect(agriWorksExportQuerySchema.safeParse(extra).success).toBe(false);
  });
});
