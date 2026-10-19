import type { Metadata } from 'next';
import './shoot-base.css';
export const metadata:Metadata={applicationName:'vibephoto',title:'vibephoto · 真实地点，好玩合影',description:'带奶蛙去真实地点合影，或拍一组地标与餐厅大片。分别准备本人、角色与地点参考，保存六镜计划与作品版本。真实生成按验收状态开放。'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>;}
