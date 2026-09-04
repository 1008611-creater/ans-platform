# RunningHub 冠军路由

先加载 `runninghub-workflow-api`，再只加载一个最匹配的专项 Skill。冠军入口拥有素材上传、消费级 Key、HTTP/1.1、任务幂等、轮询、RH 币结算、临时结果下载与念念智选服务端回传；专项 Skill 拥有工作流/AI 应用 ID、节点映射、模型参数和业务创作规则。

| 专项 Skill | 使用条件 | 交回冠军入口的内容 |
| --- | --- | --- |
| `runninghub-animate-motion-transfer` | Animate V9 动作迁移 | `webappId`、`275.video`、`299.image`、实例故障规则 |
| `minimaxh3skill` | MiniMax H3 视频 | 已验证通道、素材槽位、模型参数 |
| `runninghub-image2-text` | Image G 文生图 | 提交参数与图像输出契约 |
| `runninghub-image2-image` | Image G 图生图 | 参考图参数与图像输出契约 |
| `runninghub-canvas-media-upload` | 画布人工/浏览器运行 | 已绑定的画布节点与真实预览证据 |
| `runninghub-fruit-commerce-video` | 水果电商工作流 | 电商工作流与中文创作规则 |
| `runninghub-canvas-fallback` | 图片渠道失败切换 | 失败证据与下一候选渠道 |

专项 Skill 不得复制或覆盖冠军入口的 Key、上传、计费、重提和网站回传规则。对需要 RunningHub 的网站功能，使用冠军入口的 `念念智选网站接入契约`，前端不接触 RH Key 或 RH 临时结果 URL。
