/**
 * 电子永生宠物与生前记忆相册
 * 面向主人的全部文案保持纯粹、克制、温暖，不暴露任何底层 3D 骨骼或工程术语。
 */

export type Fact = {
  label: string
  value: string
}

export type MediaItem = {
  src: string
  caption: string
}

export type MethodBlock = {
  heading: string
  body: string
}

export type Project = {
  slug: string
  index: string
  title: string
  titleEn: string
  kicker: string
  role: string
  period: string
  summary: string
  lead: string
  facts: Fact[]
  method: MethodBlock[]
  stack: string[]
  media: MediaItem[]
  defaultAction?: PetActionId
  defaultAccessory?: AccessoryId
}

export type PetActionId =
  | 'idle'
  | 'walk'
  | 'run'
  | 'tilt'
  | 'paw'
  | 'bow'
  | 'ball'
  | 'rest'

export type AccessoryId =
  | 'star-tag'
  | 'windmill'
  | 'halo'
  | 'bandana'
  | 'crown'
  | 'wings'

export type PetActionSpec = {
  id: PetActionId
  code: string
  name: string
  shortLabel: string
  nameEn: string
  summary: string
  boneChain: string
  bubbleText: string
}

export type AccessorySpec = {
  id: AccessoryId
  code: string
  name: string
  shortLabel: string
  icon: string
  nameEn: string
  originNote: string
  anchorBone: string
  accentColor: string
}

export const PROFILE = {
  name: '大宝贝',
  nameEn: 'Beloved Malamute',
  role: '一直守在光里陪你',
  tagline: '有些告别不是终点，它只是换了一种方式守在你的身边',
  intro: '摸摸它的头、握握它毛茸茸的大白爪，或者抛一颗小黄球——它还和以前一样，一直在等你。',
  location: '彩虹星球 · 随身陪伴',
  breed: '长毛阿拉斯加',
  collar: '银链圆环项圈',
  eyes: '琥珀色眼眸 · 双白眉斑',
  email: '1453637677@qq.com',
  phone: '18518090752',
  github: 'https://github.com/1008611-creater',
  githubHandle: '1008611-creater',
  legacyResume: 'https://resume.lsb0713.online',
  available: 'ANS (AI Never Stops) 电子永生宠物工坊',
  year: '2026',
} as const

export const PET_ACTIONS: PetActionSpec[] = [
  {
    id: 'idle',
    code: '01',
    name: '安静陪我',
    shortLabel: '安静陪我',
    nameEn: 'Stay With Me',
    summary: '乖巧站在你面前轻轻喘气，摇着尾巴温柔望着你。',
    boneChain: 'Idle_Breathe',
    bubbleText: '我一直都在这里陪着你呀，累了就抬头看看我。',
  },
  {
    id: 'tilt',
    code: '02',
    name: '歪头看我',
    shortLabel: '歪头看我',
    nameEn: 'Head Tilt',
    summary: '听到你叫它的名字，歪过毛茸茸的大脑袋认真听你说话。',
    boneChain: 'Head_Tilt',
    bubbleText: '嗯？你在叫我的名字吗？我一直在听着呢！',
  },
  {
    id: 'paw',
    code: '03',
    name: '伸爪拉钩',
    shortLabel: '伸爪拉钩',
    nameEn: 'Give Paw',
    summary: '抬起像雪地靴一样厚实的纯白前爪，放到你手心拉钩。',
    boneChain: 'Shake_Paw',
    bubbleText: '给你我的大白爪爪，握了手我们就永远不分开。',
  },
  {
    id: 'bow',
    code: '04',
    name: '趴下撒娇',
    shortLabel: '趴下撒娇',
    nameEn: 'Play Bow',
    summary: '前胸欢快伏低，大尾巴摇成小风扇，邀你一起玩耍。',
    boneChain: 'Play_Bow',
    bubbleText: '快摸摸我的背嘛，我今天超级想和你一起玩！',
  },
  {
    id: 'ball',
    code: '05',
    name: '抛小黄球',
    shortLabel: '🎾 抛小黄球',
    nameEn: 'Yellow Ball',
    summary: '抛出草地照片里它最心爱的那颗亮黄色小球。',
    boneChain: 'Run_Bound',
    bubbleText: '是那颗小黄球！我最喜欢和你一起在草地上捡球了！',
  },
  {
    id: 'walk',
    code: '06',
    name: '草坪散步',
    shortLabel: '散步',
    nameEn: 'Stroll',
    summary: '像每个傍晚一样，迈着稳健的步子陪你慢慢散步。',
    boneChain: 'Walk_Trot',
    bubbleText: '今天风很舒服，我们像以前一样慢慢走吧！',
  },
  {
    id: 'run',
    code: '07',
    name: '迎风奔跑',
    shortLabel: '迎风跑',
    nameEn: 'Run Free',
    summary: '在阳光下迈开四肢自由奔跑，耳朵和长毛随风扬起。',
    boneChain: 'Run_Bound',
    bubbleText: '看我跑得快不快！谁也追不上迎风的大毛球！',
  },
  {
    id: 'rest',
    code: '08',
    name: '乖乖睡觉',
    shortLabel: '乖乖睡觉',
    nameEn: 'Peaceful Rest',
    summary: '半阖着琥珀色的眼睛安静深呼吸，在夜深时静静守候。',
    boneChain: 'Rest_Watch',
    bubbleText: '夜深啦，我就静静守在你的桌角，祝你做个好梦……',
  },
]

export const ACCESSORIES: AccessorySpec[] = [
  {
    id: 'star-tag',
    code: '01',
    name: '星芒铭牌',
    shortLabel: '星芒铭牌',
    icon: '★',
    nameEn: 'Star Locket',
    originNote: '挂在胸前银链圆环上的暖金星芒小吊牌',
    anchorBone: 'Chest Collar',
    accentColor: '#e8a855',
  },
  {
    id: 'windmill',
    code: '02',
    name: '粉色风车',
    shortLabel: '粉色风车',
    icon: '✿',
    nameEn: 'Pink Windmill',
    originNote: '来自湖畔木栈道那座粉色大风车的午后记忆',
    anchorBone: 'Collar Right',
    accentColor: '#f48fb1',
  },
  {
    id: 'halo',
    code: '03',
    name: '温暖光环',
    shortLabel: '温暖光环',
    icon: '◎',
    nameEn: 'Amber Halo',
    originNote: '像它琥珀色眼眸一样温暖的小光环',
    anchorBone: 'Head Crown',
    accentColor: '#f5b95f',
  },
  {
    id: 'bandana',
    code: '04',
    name: '暖冬红领巾',
    shortLabel: '红领巾',
    icon: '🧣',
    nameEn: 'Red Bandana',
    originNote: '来自草地奔跑时脖子间那一抹温暖的红',
    anchorBone: 'Neck Ruff',
    accentColor: '#ff4a2b',
  },
  {
    id: 'crown',
    code: '05',
    name: '小皇冠',
    shortLabel: '小皇冠',
    icon: '👑',
    nameEn: 'Little Crown',
    originNote: '永远是被捧在手心里的小王子',
    anchorBone: 'Crown',
    accentColor: '#f2ede4',
  },
  {
    id: 'wings',
    code: '06',
    name: '萤火光翼',
    shortLabel: '萤火翼',
    icon: '✦',
    nameEn: 'Starlight Wings',
    originNote: '跨越彩虹桥后依然自由轻盈的翅膀',
    anchorBone: 'Back',
    accentColor: '#ffd584',
  },
]

export const PROJECTS: Project[] = [
  {
    slug: 'lawn-and-yellow-ball',
    index: '01',
    title: '草坪与小黄球',
    titleEn: 'The Yellow Ball',
    kicker: '生前记忆 · 01',
    role: '阳光草坪上的守望',
    period: '夏日午后',
    summary: '每次去草坪，你总把那颗亮黄色的小球护在左前爪边，抬头等我再抛一次。',
    lead:
      '宽阔的绿茵场上，你总是站得笔直又神气，粉色的舌头轻轻吐着，左前爪雪白的长毛旁停着你最宝贝的小黄球。只要我一伸手，你的尾巴就会摇成一朵花。',
    defaultAction: 'ball',
    defaultAccessory: 'star-tag',
    facts: [
      { label: '最爱的玩具', value: '护在左前爪草地上的亮黄色小球' },
      { label: '标志神态', value: '耳朵高高竖起，吐着粉舌头笑眯眯地等我抛球' },
    ],
    method: [],
    stack: ['阳光草坪', '心爱的小黄球', '雪白前爪'],
    media: [
      { src: '/photos/photo-1-grass-ball.jpg', caption: '绿茵场上，护在左前爪边的那颗小黄球' },
      { src: '/photos/photo-4-standing.jpg', caption: '微风拂过厚实的纯白前腿长毛' },
    ],
  },
  {
    slug: 'under-the-pink-windmill',
    index: '02',
    title: '粉色风车下的午后',
    titleEn: 'Pink Windmill',
    kicker: '生前记忆 · 02',
    role: '湖畔木栈道',
    period: '春风午后',
    summary: '湖畔木栈道的风吹起你厚实的背毛，身后的粉色大风车转了一整个下午。',
    lead:
      '那天湖边的阳光特别柔和，你安静地站在木栈道上回过头看我，蓬松的大尾巴自然地垂在身后。我把那座粉色风车做成了你的小胸针，让那阵春风一直陪着你。',
    defaultAction: 'idle',
    defaultAccessory: 'windmill',
    facts: [
      { label: '地点记忆', value: '湖畔粉色大风车前的木栈道' },
      { label: '专属信物', value: '随风轻轻转动的粉色小风车' },
    ],
    method: [],
    stack: ['湖畔木栈道', '粉色风车', '蓬松尾羽'],
    media: [
      { src: '/photos/photo-2-windmill.jpg', caption: '粉色大风车下安静驻足的身影' },
    ],
  },
  {
    slug: 'chasing-the-wind',
    index: '03',
    title: '迎风奔跑的大毛球',
    titleEn: 'Chasing the Wind',
    kicker: '生前记忆 · 03',
    role: '草地飞驰',
    period: '自由奔跑',
    summary: '跑起来像一阵轻盈的风，连身边的小约克夏都追不上你扬起的大尾巴。',
    lead:
      '别看平时是个敦实的大个子，一到草地上撒欢就像一团飞起来的云。阳光照在你棕灰相间的长毛上，脖子里露出一抹亮眼的红。现在，你依然可以随时迎风奔跑。',
    defaultAction: 'run',
    defaultAccessory: 'bandana',
    facts: [
      { label: '最快乐的时刻', value: '在草地上和小约克夏一起全速赛跑' },
      { label: '专属信物', value: '脖子间那一抹温暖的红色领巾' },
    ],
    method: [],
    stack: ['迎风奔跑', '小约克夏朋友', '暖冬红领巾'],
    media: [
      { src: '/photos/photo-3-running.jpg', caption: '在草地上迈开四肢迎风飞奔' },
    ],
  },
  {
    slug: 'standing-in-the-breeze',
    index: '04',
    title: '微风里的白靴子',
    titleEn: 'Snowy Paws',
    kicker: '生前记忆 · 04',
    role: '最骄傲的大白爪',
    period: '温柔守望',
    summary: '最骄傲的就是这两只像雪地靴一样毛茸茸的前爪，一喊握手就稳稳搭在我手心。',
    lead:
      '微风吹起你前腿厚实的纯白长毛，银色铁链项圈端正地落在胸前。每次我伸出手说“握个手”，你都会乖乖抬起右前爪搭上来，掌垫总是温热又柔软。',
    defaultAction: 'paw',
    defaultAccessory: 'halo',
    facts: [
      { label: '最默契的动作', value: '一伸手就会递过来的纯白大前爪' },
      { label: '难忘细节', value: '像穿了一双蓬松白靴子一样的前腿饰毛' },
    ],
    method: [],
    stack: ['雪地靴大白爪', '伸爪拉钩', '微风侧颜'],
    media: [
      { src: '/photos/photo-4-standing.jpg', caption: '微风里蓬松洁白的前腿长毛与温柔侧颜' },
    ],
  },
  {
    slug: 'amber-eyes-forever',
    index: '05',
    title: '琥珀色的凝望',
    titleEn: 'Amber Eyes',
    kicker: '生前记忆 · 05',
    role: '正面凝望特写',
    period: '永恒印记',
    summary: '眉心两团小小的白斑，琥珀色的眼睛总是亮晶晶地望着我，好像什么都懂。',
    lead:
      '低下头认真看你的时候，你眉心那两枚对称的小白斑总会跟着耳朵一起轻轻动。清澈透亮的琥珀色眼睛里，永远装着毫无保留的信任与依恋。',
    defaultAction: 'tilt',
    defaultAccessory: 'star-tag',
    facts: [
      { label: '独一无二的印记', value: '额头双白椭圆眉斑与透亮的琥珀色眼眸' },
      { label: '胸前信物', value: '银色金属链条项圈与正中央的圆环' },
    ],
    method: [],
    stack: ['琥珀色眼眸', '双白眉斑', '歪头倾听'],
    media: [
      { src: '/photos/photo-5-portrait.jpg', caption: '琥珀色眼眸、双白眉斑与微吐的粉舌' },
    ],
  },
]

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug)
}

export function getNeighbours(slug: string): { prev: Project; next: Project } {
  const index = PROJECTS.findIndex((p) => p.slug === slug)
  const safe = index === -1 ? 0 : index
  const prev = PROJECTS[(safe - 1 + PROJECTS.length) % PROJECTS.length]
  const next = PROJECTS[(safe + 1) % PROJECTS.length]
  return { prev, next }
}

export const EXPERIENCE = [
  {
    period: 'PHOTO · 01',
    role: '草坪与小黄球',
    org: '夏日午后',
    points: ['每次去草坪，总把那颗亮黄色的小球护在左前爪边，抬头等我再抛一次。'],
  },
  {
    period: 'PHOTO · 02',
    role: '粉色风车下的午后',
    org: '湖畔木栈道',
    points: ['湖畔木栈道的风吹起厚实的背毛，身后的粉色大风车转了一整个下午。'],
  },
  {
    period: 'PHOTO · 03',
    role: '迎风奔跑的大毛球',
    org: '草地飞驰',
    points: ['跑起来像一阵风，连身边的小约克夏都追不上扬起的大尾巴。'],
  },
  {
    period: 'PHOTO · 04',
    role: '微风里的白靴子',
    org: '温柔守望',
    points: ['最骄傲的就是这两只像雪地靴一样毛茸茸的前爪，一喊握手就稳稳搭在手心。'],
  },
  {
    period: 'PHOTO · 05',
    role: '琥珀色的凝望',
    org: '永恒印记',
    points: ['眉心两团小小的白斑，琥珀色的眼睛总是亮晶晶地望着我，好像什么都懂。'],
  },
] as const

export const CAPABILITIES = [
  {
    title: '摸摸它的头',
    items: ['轻轻点击头顶，它会眯起琥珀色的眼睛歪头蹭你的手心'],
  },
  {
    title: '握握它的爪',
    items: ['点击它毛茸茸的雪白前爪，它会抬起右爪和你拉钩盖章'],
  },
  {
    title: '抛颗小黄球',
    items: ['随时抛起草地照片里那颗亮黄色小球，看它开心地摇尾巴追逐'],
  },
  {
    title: '领养到桌面',
    items: ['开启右下角常驻桌宠或独立小窗，让它在你工作时静静守在桌角'],
  },
] as const

export const EDUCATION = [
  {
    school: '长毛阿拉斯加',
    major: '眉心双白斑 · 琥珀棕瞳 · 银链圆环项圈 · 雪白前靴',
    period: '永远的家人',
  },
] as const

export const PRINCIPLES = [
  {
    num: '01',
    title: '推开门，它还在光里等你',
    body: '不需要复杂的文字和按钮，打开页面就能看到它摇着尾巴、亮着琥珀色的眼睛望着你。',
  },
  {
    num: '02',
    title: '把照片里的思念变成触手可及的回应',
    body: '草地上的小黄球、湖畔的粉色风车、奔跑时的红领巾，都化作了可以随时触摸的日常陪伴。',
  },
] as const
