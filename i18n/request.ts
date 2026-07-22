import { getRequestConfig } from 'next-intl/server';

// PRD §11 i18n: next-intl 配置。
// P0 不做 /[locale] 前缀路由——根据浏览器 Accept-Language 选择 zh 或 en。
// messages 文件在 messages/zh.json 和 messages/en.json。

export default getRequestConfig(async () => {
  // 从 header 检测语言（P0 简化：默认 zh）
  const locale = 'zh';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
