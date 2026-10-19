import type {ShotId} from '@/app/lib/shoot-contract';
// Vector storyboard only. These diagrams are never supplied as generated photographs.
export default function FrameSketch({id,companion=false,urban=false}:{id:ShotId;companion?:boolean;urban?:boolean}){
 const landscape=<><path d="M0 98L28 65L54 87L90 42L120 73V150H0Z" fill="currentColor" opacity=".07"/><path d="M0 116Q36 91 120 105" fill="none" stroke="currentColor" opacity=".22"/><circle cx="93" cy="26" r="10" fill="currentColor" opacity=".1"/></>;
 const person=(x:number,y:number,scale=1)=> <g transform={'translate('+x+' '+y+') scale('+scale+')'}><ellipse cx="0" cy="0" rx="11" ry="14" fill="currentColor" opacity=".62"/><path d="M-9 18Q0 14 9 18L17 55H-17Z" fill="currentColor" opacity=".33"/><path d="M-8 58L-11 91M8 58L14 91M-11 24L-23 48M11 24L22 47" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity=".5" fill="none"/></g>;
 return <svg viewBox="0 0 120 150" aria-hidden="true">{urban?<><path d="M0 115V65H20V90H35V45H55V80H76V35H93V74H120V150H0Z" fill="currentColor" opacity=".09"/><path d="M0 120H120" stroke="currentColor" opacity=".2"/></>:landscape}<path d="M40 0V150M80 0V150M0 50H120M0 100H120" stroke="currentColor" opacity=".1" strokeDasharray="2 3"/>
 {id==='cover'&&person(60,43,1.4)}
 {id==='place'&&person(36,86,.48)}
 {id==='portrait'&&<><path d="M4 150Q8 100 60 104Q113 101 117 150" fill="currentColor" opacity=".28"/><ellipse cx="60" cy="62" rx="30" ry="38" fill="currentColor" opacity=".52"/><path d="M42 60H49M71 60H78M54 82Q60 86 67 81" stroke="#f7f6f2" strokeWidth="2" fill="none"/></>}
 {id==='motion'&&<g fill="none" stroke="currentColor" strokeLinecap="round"><ellipse cx="63" cy="36" rx="10" ry="13" fill="currentColor" opacity=".6"/><path d="M60 53L55 90M61 59L83 76M57 59L35 74M55 92L33 130M55 92L85 123" strokeWidth="7" opacity=".43"/><path d="M13 62H28M13 69H23M86 98H105" opacity=".28" strokeWidth="2"/></g>}
 {id==='pause'&&urban&&person(56,43,1)}
 {id==='pause'&&!urban&&<><path d="M29 100H118V125H15" fill="none" stroke="currentColor" opacity=".2" strokeWidth="4"/><ellipse cx="51" cy="48" rx="11" ry="14" fill="currentColor" opacity=".6"/><path d="M50 67L47 91L80 95L86 128M52 72L69 92" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" opacity=".4"/></>}
 {id==='detail'&&<><ellipse cx="69" cy="36" rx="20" ry="26" fill="currentColor" opacity=".55"/><path d="M43 72Q69 61 87 74L104 150H23Z" fill="currentColor" opacity=".3"/><path d="M39 92L22 64L53 32M87 81L100 124" stroke="currentColor" strokeWidth="9" strokeLinecap="round" opacity=".48" fill="none"/><path d="M52 73L67 93L80 70M67 95V143" stroke="currentColor" opacity=".5" fill="none"/></>}
 {companion&&<g><rect x="77" y="87" width="35" height="42" rx="6" fill="#eef0ff" stroke="currentColor" strokeDasharray="3 2"/><text x="94" y="111" textAnchor="middle" fill="currentColor" fontSize="9">角色</text></g>}
 <path d="M7 18V7H18M102 7H113V18M113 132V143H102M18 143H7V132" fill="none" stroke="currentColor" opacity=".4"/></svg>;
}
