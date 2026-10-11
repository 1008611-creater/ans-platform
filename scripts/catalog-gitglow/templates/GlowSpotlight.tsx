import React from 'react';
import { DEFAULT_COLOR, useCover, cn, convertIconTitleToIcon } from '../runtime';

const theme = (values: Record<string, string | string[] | boolean>) =>
  (values.themeColor as string) || DEFAULT_COLOR;

const GlowSpotlight = () => {
  const { values, font } = useCover();
  const year = values.category;
  const iconTitles = Array.isArray(values.icons) ? values.icons : [];
  const themeColor = theme(values);
  return (
    <div
      className="w-full h-full relative flex flex-col justify-between p-12 overflow-hidden bg-preview-background"
      style={font ? { fontFamily: font } : undefined}
    >
      <div className="absolute top-0 left-0 w-full h-full z-20 bg-linear-to-t from-preview-background via-transparent to-transparent" />

      <div
        className={cn(
          'absolute bottom-0 left-1/2 z-10 w-[1280px] h-[720px] rounded-[32px] bg-preview-background bg-cover bg-top -translate-x-1/2 translate-y-[20%] scale-[0.85]',
          !values.image && 'bg-preview-placeholder bg-center',
        )}
        style={{
          boxShadow: `0 0 100px 16px ${themeColor}, 0 0 0 10px ${themeColor}`,
          ...(values.image && {
            backgroundImage: `url(${values.image})`,
          }),
        }}
      />

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

      <div className="z-20 cover-title flex flex-col items-center justify-center text-center">
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
          <div className="flex flex-wrap gap-7 mt-10 justify-center">
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

export default GlowSpotlight;
