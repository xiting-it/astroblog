import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * 站点配置的类型定义，对应 site-config.yaml 的结构。
 * 字段保持完整以便未来扩展（部分字段当前未被代码读取，但 YAML 中存在）。
 */
export interface SiteConfig {
  site: {
    title: string;
    description: string;
    keywords: string;
    author: string;
  };
  background: {
    mode: 'png' | 'mp4' | 'player';
    player: {
      enabled: boolean;
      container_id: string;
      user_id: number;
      vcode: string;
      auto_play: boolean;
    };
    png: {
      url: string;
      opacity: number;
      size: string;
      position: string;
      attachment: string;
    };
    mp4: {
      url: string;
      opacity: number;
      autoplay: boolean;
      loop: boolean;
      muted: boolean;
    };
  };
  header: {
    title: string;
    subtitle: string;
  };
  navigation: Array<{
    name: string;
    url: string;
  }>;
  footer: {
    copyright: string;
    powered_by: string;
  };
  search: {
    enabled: boolean;
    placeholder: string;
  };
  features: {
    back_to_top: boolean;
    pace_loading: boolean;
    code_highlight: boolean;
    lazy_load_images: boolean;
  };
}

let configCache: SiteConfig | null = null;

/**
 * 加载 site-config.yaml。
 * 仅在服务端调用（Astro frontmatter / 构建期）。
 * 加载失败直接抛错——避免静默 fallback 到陈旧默认值掩盖配置问题。
 */
export function loadConfig(): SiteConfig {
  if (configCache) {
    return configCache;
  }

  const configPath = path.join(process.cwd(), 'site-config.yaml');
  const fileContents = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(fileContents) as SiteConfig;

  if (!config || !config.site) {
    throw new Error(`site-config.yaml 解析失败或缺少 site 字段：${configPath}`);
  }

  configCache = config;
  return config;
}
