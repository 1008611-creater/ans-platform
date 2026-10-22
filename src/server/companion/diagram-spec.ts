/**
 * 详情图渲染（P0）：把"领域事实"渲染成自包含 SVG。
 *
 * 为什么不用 archify 直接渲染：archify 是外部 CLI，产出 800KB 的自包含 HTML，
 * 适合做离线交付物；页面内联需要的是可控、可测、可 SSR 的小 SVG。
 * 这里先实现最常用的"分层架构图"，后续 gitflow / 时序 / 生命周期各加一个纯函数即可。
 */

export interface DiagramItem {
  /** 节点主标签，例如「农事管理」 */
  label: string;
  /** 次要说明，例如「作业 / 记录」 */
  hint?: string;
}

export interface DiagramLayer {
  /** 层名，例如「应用层」 */
  label: string;
  items: DiagramItem[];
}

export interface LayeredDiagram {
  layers: DiagramLayer[];
}

const PALETTE = {
  ink: "#12211C",
  inkSoft: "#4A5C55",
  mint: "#9BE0C5",
  mintDeep: "#5BC49A",
  mintWash: "#EAF7F1",
  line: "#CFE3D8",
  chip: "#FFFFFF",
};

/** 只做几何与文字排布，不引第三方依赖，SSR 与单测都能跑。 */
export function renderLayeredDiagram(diagram: LayeredDiagram): string {
  const layers = diagram.layers.slice(0, 5);
  const columns = Math.max(...layers.map((layer) => layer.items.length), 1);
  const rowHeight = 84;
  const rowGap = 14;
  const labelWidth = 96;
  const chipGap = 10;
  const chipWidth = 116;
  const width = labelWidth + columns * (chipWidth + chipGap) + 16;
  const height = layers.length * (rowHeight + rowGap) + 8;

  const rows = layers
    .map((layer, rowIndex) => {
      const y = rowIndex * (rowHeight + rowGap) + 4;
      const chips = layer.items
        .slice(0, columns)
        .map((item, columnIndex) => {
          const x = labelWidth + columnIndex * (chipWidth + chipGap);
          return `<g><rect x="${x}" y="${y}" width="${chipWidth}" height="${rowHeight}" rx="10" fill="${PALETTE.chip}" stroke="${PALETTE.line}"/><text x="${x + 12}" y="${y + 34}" font-size="12.5" fill="${PALETTE.ink}">${escapeXml(item.label)}</text>${item.hint ? `<text x="${x + 12}" y="${y + 54}" font-size="10.5" fill="${PALETTE.inkSoft}">${escapeXml(item.hint)}</text>` : ""}</g>`;
        })
        .join("");
      const connector =
        rowIndex === 0
          ? ""
          : `<path d="M${labelWidth + 8} ${y - rowGap / 2 - 2} v${rowGap - 6}" stroke="${PALETTE.mintDeep}" stroke-width="1.3" fill="none"/>`;
      return `<g><rect x="0" y="${y}" width="${labelWidth - 10}" height="${rowHeight}" rx="10" fill="${PALETTE.mintWash}"/><text x="14" y="${y + rowHeight / 2 + 5}" font-size="12.5" fill="${PALETTE.ink}" font-weight="600">${escapeXml(layer.label)}</text>${chips}${connector}</g>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeXml(layers.map((layer) => layer.label).join(" / "))}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="none"/>${rows}</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char] as string));
}
