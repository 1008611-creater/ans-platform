export type CoverValues = Record<string, string | string[] | boolean>;
let current: {values:CoverValues; font:string} = { values: {}, font: '' };
export const DEFAULT_COLOR = '#a2c795';
export const useCover = () => current;
export const setCover = (values:CoverValues) => { current = {values, font:'Segoe UI, Microsoft YaHei, sans-serif'}; };
export const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');
export const convertIconTitleToIcon = (title:string) => title.toLowerCase().replaceAll(' ','');
