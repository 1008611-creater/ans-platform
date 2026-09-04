# Image2 共享会话

## 目标

让所有线程直接调用同一个 `image2-skill`，由 Agent Vault 统一注入云雾服务认证。线程只看到代理环境，不接触云雾供应商密钥。

## 一次性配置

- 服务：`yunwu-image`，主机范围固定为 `yunwu.ai/v1/*`。
- 智能体：`codex-image2`，仅 `niannian-production` 的 `proxy`（代理）角色。
- 运行环境：由用户的受保护启动器统一注入以下非秘密变量和会话令牌：
  - `AGENT_VAULT_ADDR=http://127.0.0.1:14321`
  - `AGENT_VAULT_VAULT=niannian-production`
  - `AGENT_VAULT_TOKEN=<受保护注入，不写入任何项目文件>`

## 线程调用

所有线程直接运行 `scripts/image2_channel.py`。它会先读取用户专属的
`C:/Users/lsb/.codex/secrets/image2-agent-vault.env`（可用
`IMAGE2_SHARED_ENV_FILE` 覆盖路径），只加载三个代理字段；缺失时只生成阻塞回执，不访问供应商。

文件格式（只在本机填写令牌值，不要把它粘贴到聊天或项目文件）：

```text
AGENT_VAULT_ADDR=http://127.0.0.1:14321
AGENT_VAULT_VAULT=niannian-production
AGENT_VAULT_TOKEN=<在本机粘贴 Agent Vault 会话令牌>
```

将该文件放在用户专属目录并限制为当前用户可读；Skill（技能）只在进程内使用它，不会写回、打印或记录令牌。

## 轮换

会话令牌失效时，只在受保护启动器中替换一次并重启 Codex。不要在聊天、`auth.json`、Skill（技能）文件、提示词、回执或项目台账中保存令牌，也不要为每个线程重新创建令牌。
