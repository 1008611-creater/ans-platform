/**
 * Webhook 契约层：占位符常量、Slack 预设 payload 与 JSON 值类型。
 *
 * 这些常量不含任何服务端依赖，放在 contracts 层是为了让客户端组件
 * （src/components/admin/webhooks-table.tsx）不必 import @/lib/webhook，
 * 避免把数据库/Prisma 依赖拖进浏览器 bundle。
 */
// Available placeholders for webhook payloads
export const WEBHOOK_PLACEHOLDERS = {
  PROMPT_ID: "{{PROMPT_ID}}",
  PROMPT_TITLE: "{{PROMPT_TITLE}}",
  PROMPT_DESCRIPTION: "{{PROMPT_DESCRIPTION}}",
  PROMPT_CONTENT: "{{PROMPT_CONTENT}}",
  PROMPT_TYPE: "{{PROMPT_TYPE}}",
  PROMPT_URL: "{{PROMPT_URL}}",
  PROMPT_MEDIA_URL: "{{PROMPT_MEDIA_URL}}",
  AUTHOR_USERNAME: "{{AUTHOR_USERNAME}}",
  AUTHOR_NAME: "{{AUTHOR_NAME}}",
  AUTHOR_AVATAR: "{{AUTHOR_AVATAR}}",
  CATEGORY_NAME: "{{CATEGORY_NAME}}",
  TAGS: "{{TAGS}}",
  TIMESTAMP: "{{TIMESTAMP}}",
  SITE_URL: "{{SITE_URL}}",
  CHATGPT_URL: "{{CHATGPT_URL}}",
} as const;

// Slack Block Kit preset for new prompts
export const SLACK_PRESET_PAYLOAD = `{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "{{PROMPT_TITLE}}",
        "emoji": true
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Prompt",
            "emoji": true
          },
          "url": "{{PROMPT_URL}}",
          "style": "primary",
          "action_id": "view_prompt"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Run in ChatGPT",
            "emoji": true
          },
          "url": "{{CHATGPT_URL}}",
          "action_id": "run_chatgpt"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "{{PROMPT_TYPE}}",
            "emoji": true
          },
          "action_id": "type_badge"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "\`\`\`{{PROMPT_CONTENT}}\`\`\`"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "{{PROMPT_DESCRIPTION}}"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Author:*\\n<{{SITE_URL}}/@{{AUTHOR_USERNAME}}|@{{AUTHOR_USERNAME}}>"
        },
        {
          "type": "mrkdwn",
          "text": "*Category:*\\n{{CATEGORY_NAME}}"
        },
        {
          "type": "mrkdwn",
          "text": "*Tags:*\\n{{TAGS}}"
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": "{{AUTHOR_AVATAR}}",
          "alt_text": "{{AUTHOR_NAME}}"
        },
        {
          "type": "mrkdwn",
          "text": "Created by *{{AUTHOR_NAME}}* on {{TIMESTAMP}}"
        }
      ]
    },
    {
      "type": "divider"
    }
  ]
}`;

/**
 * 与 Prisma `JsonValue` 结构等价的 JSON 值类型。
 *
 * 客户端组件只应依赖 contracts 层类型，不应直接 import @prisma/client。
 */
export type JsonValue = string | number | boolean | JsonObject | JsonArray | null;

export type JsonObject = { [key: string]: JsonValue | undefined };

export type JsonArray = JsonValue[];
