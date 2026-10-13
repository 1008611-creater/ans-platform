import Link from "next/link";
import styles from "./catalog-pagination.module.css";

interface CatalogPaginationProps {
  page: number;
  pages: number;
  href: (page: number) => string;
  labels: { navigation: string; previous: string; next: string; page: (page: number) => string };
}

export function CatalogPagination({ page, pages, href, labels }: CatalogPaginationProps) {
  if (pages < 2) return null;
  const numbers = [...new Set([1, page - 1, page, page + 1, pages])].filter(value => value > 0 && value <= pages).sort((a, b) => a - b);
  return <nav aria-label={labels.navigation} className={styles.root}>
    {page > 1 ? <Link href={href(page - 1)} rel="prev">{labels.previous}</Link> : <span aria-disabled="true">{labels.previous}</span>}
    <div className={styles.pages}>{numbers.map((value, index) => <span className={styles.item} key={value}>
      {index > 0 && value - numbers[index - 1] > 1 && <span className={styles.gap} aria-hidden="true">…</span>}
      <Link href={href(value)} aria-label={labels.page(value)} aria-current={page === value ? "page" : undefined}>{value}</Link>
    </span>)}</div>
    {page < pages ? <Link href={href(page + 1)} rel="next">{labels.next}</Link> : <span aria-disabled="true">{labels.next}</span>}
  </nav>;
}
