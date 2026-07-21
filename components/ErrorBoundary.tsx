'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

// 客户端崩溃兜底（PRD §16：token 获取失败不白屏）
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-red-400">
              {this.state.message ?? '页面出错了'}
            </p>
            <button
              onClick={() => location.reload()}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm"
            >
              重试
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
