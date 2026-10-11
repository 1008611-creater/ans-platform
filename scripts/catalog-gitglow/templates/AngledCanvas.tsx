import React from 'react';
import { DEFAULT_COLOR, useCover, cn, convertIconTitleToIcon } from '../runtime';

const theme = (values: Record<string, string | string[] | boolean>) =>
  (values.themeColor as string) || DEFAULT_COLOR;

const AngledCanvas = () => {
  const { values, font } = useCover();
  const year = values.category;
  const iconTitles = Array.isArray(values.icons) ? values.icons : [];
  const themeColor = theme(values);
  return (
    <div
      className="w-full h-full relative flex flex-col justify-between p-12 overflow-hidden bg-preview-background"
      style={font ? { fontFamily: font } : undefined}
    >
      <div
        className="absolute top-0 left-0 w-full h-full z-10"
        style={{
          background: `linear-gradient(to bottom, ${themeColor} 0%, transparent 100%)`,
        }}
      />

      <div className="absolute top-0 left-0 w-full h-full z-10 bg-linear-to-r from-preview-background/50 to-transparent" />

      <div
        className={cn(
          'absolute top-0 left-0 w-full h-full blur-xs bg-cover bg-center',
          !values.image && 'bg-preview-placeholder',
        )}
        style={
          values.image ? { backgroundImage: `url(${values.image})` } : undefined
        }
      />

      <div className="absolute -right-[200px] bottom-[10%] z-20 w-[900px]">
        <div className="relative aspect-video">
          <div className="absolute inset-0 rounded-xl bg-preview-background/80 ring-1 ring-preview-foreground/10 shadow-lg/50 rotate-7 translate-x-[32px] translate-y-[32px]" />

          <div className="absolute inset-0 rounded-xl bg-preview-background/80 ring-1 ring-preview-foreground/10 shadow-lg/50 rotate-7 translate-x-[16px] translate-y-[16px]" />

          <div
            className={cn(
              'absolute inset-0 overflow-hidden rounded-xl bg-cover bg-top-left shadow-lg/50 ring-1 ring-preview-foreground/10 rotate-7',
              !values.image && 'bg-preview-placeholder bg-center',
            )}
            style={{
              ...(values.image && {
                backgroundImage: `url(${values.image})`,
              }),
            }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-[20px] tracking-[0.12em] font-semibold z-20 text-preview-foreground">
          {year}
        </div>
        {values.label && (
          <div className="text-[20px] tracking-[0.12em] font-semibold z-20 text-preview-foreground">
            {values.label}
          </div>
        )}
      </div>

      <div className="z-20 cover-title">
        {values.titleMain && (
          <p className="text-[68px] leading-[1.08] tracking-[-0.04em] font-semibold text-preview-foreground">
            {values.titleMain}
          </p>
        )}
        {values.titleAccent && (
          <p
            className="text-[68px] leading-[1.08] tracking-[-0.04em] font-semibold mt-3 text-preview-foreground"
            style={{ color: themeColor }}
          >
            {values.titleAccent}
          </p>
        )}
        {iconTitles.length > 0 && (
          <div className="flex flex-wrap gap-7 mt-10">
            {iconTitles.map((title: string) => {
              const slug = convertIconTitleToIcon(title);
              return (
                <span
                  key={slug}
                  className="inline-block size-[75px] shrink-0 bg-preview-icon"
                  style={{
                    WebkitMask: `url(/icons/${slug}.svg) no-repeat center`,
                    WebkitMaskSize: 'contain',
                    mask: `url(/icons/${slug}.svg) no-repeat center`,
                    maskSize: 'contain',
                  }}
                  title={title}
                  role="img"
                  aria-label={title}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AngledCanvas;
