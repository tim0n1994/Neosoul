import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 暧昧 · 高级感 暖色系
        // 深色基底偏暖（非冷蓝黑），营造亲密朦胧感
        ink: {
          950: '#08060a',  // 最深底色 — 暖近黑
          900: '#0d0a10',  // 主背景
          800: '#15101a',  // 次级面板
          700: '#1e1722',  // 卡片
          600: '#2a2030',  // 边框/分割
        },
        // 签名色：暧昧玫瑰金（低饱和度，不刺眼）
        rose: {
          DEFAULT: '#c47b78',  // 主 accent — 暖玫瑰
          light: '#d9a29a',    // 浅玫瑰（hover/激活）
          deep: '#9c5e5c',     // 深玫瑰（按下/阴影）
        },
        gold: {
          DEFAULT: '#b89968',  // 辅 accent — 暖金
          light: '#d4b888',
        },
        // 暖色文字
        cream: {
          50: '#f5efe9',   // 主文字 — 暖白
          100: '#e8e0d8',  // 次文字
          200: '#c0b5ac',  // 辅助文字
          300: '#8a7f78',  // 弱化文字
        },
      },
      fontFamily: {
        sans: [
          'var(--font-display)',
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
