import { useSite } from '../site/context'

const PRINT_PROCESS_COMPARISON = [
  {
    name: '拓竹 Bambu Studio 4 色 AMS 预分色（主推合伙人 B 家用机直印）',
    tag: 'malamute_running_bambu_4color.3mf · 双白眉斑保真 + 16轮平滑',
    pros: '基于 H3.1 超清雕刻几何 (1,936,486面) 提取，面部采用 2 轮轻平滑完整保留对称双白眉斑，身体采用 16 轮连续场平滑与孤岛吸收，自动绑定 1~4 号耗材槽（哑光白/炭黑/琥珀眼/樱花粉舌头），彻底解决碎色面吐竹屎痛点。',
    note: '三足自然着地深植椭圆底座 2.3mm（仅左前爪自然腾空迈步，零突兀胸口支撑柱！）+ 底座底部 Ø26mm NFC 芯片沉孔。',
  },
  {
    name: '光固化 SLA / DLP 超清雕刻灰模（层高 0.025–0.05mm）',
    tag: 'malamute_running_sla_base.stl · 193.6万面原生雕刻毛发与肌肉关节',
    pros: '通过独立审查 Subagent 6 视角盲审（9.6/10 通过）：完整还原长毛阿拉斯加修长四肢比例（腿长占肩高 48%）、肩肘、前腕(carpus)、大腿肌肉、后飞节(tarsus)、后跖骨与四爪黑色肉垫，告别多视图切割导致的短腿残肢。',
    note: '同步提供带 NFC 底座直立版 (.STL) 与无底座纯奔跑主体 (.STL)。',
  },
  {
    name: 'WJP / PolyJet 白墨全彩光敏树脂（代工厂免涂装直喷）',
    tag: 'malamute_running_h31_max.glb · 1000万色 CMYK+W',
    pros: '193.6 万面超清几何搭配 4K 贴图色彩（双白眉斑、琥珀色瞳孔、粉色长舌、颈部白月牙、肩部黑马鞍与体侧斜白带 100% 还原），代工厂直喷成型，0 人工手绘成本。',
    note: '配套轨道 A：P2.0 四边面满配 (quad=true, 22,085 四边面 + v3.0 40根四足骨骼) 驱动手机端 3D 桌宠。',
  },
]

const ORIGINAL_PHOTOS = [
  { src: './photos/photo-6-running-grass.jpg', label: '生前照片 01 · 草地全速奔跑（手办主姿态基准）', note: '颈部白月牙、肩部黑马鞍、体侧银白斜带、白雪地靴与高高扬起的纯白大尾羽' },
  { src: './photos/photo-7-right-profile.jpg', label: '生前照片 02 · 右侧全身站姿（体侧花色与腿长基准）', note: '修长矫健的四肢比例（腿长占肩高近 50%）、清晰的后腿飞节与前腿纯白厚长毛' },
  { src: './photos/photo-8-windmill-closeup.jpg', label: '生前照片 03 · 湖畔回眸特写', note: '蓬松颈圈毛流、湿润鼻头、微吐粉舌与温柔回望神态' },
  { src: './photos/photo-5-portrait.jpg', label: '生前照片 04 · 正面凝望特写（面部特征基准）', note: '对称双白椭圆眉斑、透亮琥珀色瞳孔与胸前银链圆环项圈' },
  { src: './photos/photo-1-grass-ball.jpg', label: '生前照片 05 · 草坪与心爱的小黄球', note: '左前爪旁护着亮黄色小球，耳朵高高竖起等待抛球' },
  { src: './photos/photo-4-standing.jpg', label: '生前照片 06 · 微风里的白靴子', note: '双侧前肢如雪地靴般蓬松洁白的长毛体积感' },
]

const BLENDER_DIAGNOSTICS = [
  {
    src: './renders/blender_running_fullcolor_preview.png',
    label: 'H3.1 超清几何 (1,936,486 面) · 迎风奔跑全彩手办主视图',
    note: '经 Subagent 6 视角盲审 9.6/10 通过：四肢修长矫健、前腕与后飞节关节分明、三足自然植于椭圆底座（零胸口支撑柱），全身三段式花色 100% 还原',
  },
  {
    src: './renders/blender_running_sla_resin.png',
    label: '光固化 SLA 雕刻灰模打样（193.6 万面原生毛流与肌肉骨骼）',
    note: '每一簇颈毛、大腿肌肉、飞节折角、脚掌肉垫与飞扬尾羽均直接雕刻在 193.6 万面实体网格上，素模打印质感拉满',
  },
  {
    src: './renders/blender_running_bambu_4color.png',
    label: '拓竹 Bambu Studio 4 色 AMS 预分色奔跑手办 (.3MF)',
    note: '面部轻平滑完整保留双白眉斑，身体 16 轮连续场平滑消除碎色面，自动绑定 1~4 号耗材槽（哑光白/炭黑/琥珀眼/樱花粉舌头）与底座 Ø26mm NFC 暗槽',
  },
  {
    src: './renders/audit_running_anatomical_6views.png',
    label: 'Subagent 6 视角无底座四肢解剖盲审卡（9.6/10 通过）',
    note: '正/背/左/右/底视/斜视 6 角度全检：四条腿与四只黑色肉垫脚掌 100% 独立分离，彻底根除多视图切割导致的短腿残肢',
  },
  {
    src: './views/running-hero-anatomical.png',
    label: '100% 解剖与花色锁死：3/4 黄金侧斜角奔跑主视图基准',
    note: '融合 4 张实拍照片生成，严格锁死 48% 腿长比例、四肢关节与纯白像素空气间隙（Subagent 扫描线复核 9.7/10）',
  },
  {
    src: './renders/moments_reunion_photo.png',
    label: '随手办附赠：朋友圈 AI 跨时空重逢合照',
    note: '高情绪价值裂变赠品：主人手机轻触手办底座 NFC 即可领取并分享朋友圈',
  },
]

export function PipelineView() {
  const { setView } = useSite()

  return (
    <section className="pipeline-view shell" aria-label="3D打印手办工坊与数字赠品交付中心">
      <header className="pipeline-view__hero">
        <div>
          <span className="label">H3.1 超清雕刻几何 (1,871,981 面) 奔跑手办 + P2.0 四边面 40 骨手机桌宠</span>
          <h2 className="pipeline-view__title">
            <span className="serif-em">迎风奔跑手办</span>与数字陪伴交付工坊
          </h2>
          <p className="pipeline-view__lead">
            采用多视角实拍拼图锁死全身每一处花色，以 Tripo H3.1 超清几何满配（187 万面）雕刻出充满生命力的「迎风奔跑定制手办」；后蹬爪植于内嵌 Ø26mm NFC 芯片的椭圆底座，手机轻触底座即可唤醒 P2.0 40 骨驱动的「手机竖屏 3D 桌宠」与「朋友圈 AI 重逢合照」。
          </p>
        </div>
        <div className="pipeline-view__actions">
          <a
            href="./models/malamute_running_bambu_4color.3mf"
            download="malamute_running_bambu_4color.3mf"
            className="gate__btn gate__btn--primary"
          >
            下载拓竹 4 色 AMS 奔跑手办 (.3MF · 135mm)
          </a>
          <a
            href="./models/malamute_running_sla_base.stl"
            download="malamute_running_sla_base.stl"
            className="gate__btn"
          >
            下载奔跑手办带底座 STL (光固化/FDM · 18MB)
          </a>
          <a
            href="./models/malamute_running_nobase.stl"
            download="malamute_running_nobase.stl"
            className="gate__btn"
          >
            下载无底座纯奔跑主体 STL (18MB)
          </a>
          <a
            href="./models/malamute_running_h31_max.glb"
            download="malamute_running_h31_max.glb"
            className="gate__btn"
          >
            下载 187 万面 WJP 全彩直喷模型 (.GLB · 23MB)
          </a>
        </div>
      </header>

      {/* 核心主品预览：光固化 SLA 手办打样 + 朋友圈合照赠品 + 手机桌宠 */}
      <div className="pipeline-block">
        <div className="pipeline-block__head">
          <span className="label">CORE PRODUCT & BUNDLED GIFTS · 主品手办与两大数字赠品实拍</span>
          <h3>从实体光固化手办到手机端情感陪伴闭环</h3>
        </div>
        <div className="pipeline-photos">
          {BLENDER_DIAGNOSTICS.map((d) => (
            <figure key={d.label} className="pipeline-photo-card">
              <div className="pipeline-photo-card__img-wrap">
                <img src={d.src} alt={d.label} loading="lazy" />
              </div>
              <figcaption>
                <span className="label">{d.label}</span>
                <p>{d.note}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* 3D 打印三大工艺对比与 Blender MCP 工程解法 */}
      <div className="pipeline-block">
        <div className="pipeline-block__head">
          <span className="label">3D PRINTING PROCESS ENGINEERING · 光固化 SLA vs 全彩树脂 vs FDM 工艺对比</span>
          <h3>为什么普通 AI 建模无法直接 3D 打印？我们如何用 Blender MCP 解决</h3>
        </div>
        <div className="pipeline-specs">
          {PRINT_PROCESS_COMPARISON.map((proc) => (
            <div key={proc.name} className="pipeline-spec-item">
              <span className="label">{proc.tag}</span>
              <strong>{proc.name}</strong>
              <p>{proc.pros}</p>
              <span className="label pipeline-dl-link">{proc.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 生前 5 张照片与正交四视图溯源 */}
      <div className="pipeline-block">
        <div className="pipeline-block__head">
          <span className="label">ORIGIN PHOTOS & TURNAROUND · 生前照片与正交四视图基准</span>
          <h3>五张生前实拍照片与 1:1 特征还原对比</h3>
        </div>
        <div className="pipeline-photos">
          {ORIGINAL_PHOTOS.map((p) => (
            <figure key={p.label} className="pipeline-photo-card">
              <div className="pipeline-photo-card__img-wrap">
                <img src={p.src} alt={p.label} loading="lazy" />
              </div>
              <figcaption>
                <span className="label">{p.label}</span>
                <p>{p.note}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
