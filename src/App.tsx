/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Server, Key, Terminal, Code, Settings, ExternalLink, Copy, Check, Lock, Loader2 } from 'lucide-react';

export default function App() {
  const [workerUrl, setWorkerUrl] = useState('https://your-worker.workers.dev');
  const [copied, setCopied] = useState(false);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError('');
    
    try {
      const formattedUrl = workerUrl.endsWith('/') ? workerUrl.slice(0, -1) : workerUrl;
      const response = await fetch(`${formattedUrl}/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || '密码错误');
      }
    } catch (err) {
      setAuthError('无法连接到 Worker，请检查 Worker 地址是否正确。');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-zinc-50 font-sans selection:bg-emerald-500/30">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 p-8 shadow-2xl shadow-black/50"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
              <Lock className="w-6 h-6 text-zinc-950" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">管理控制台登录</h1>
            <p className="text-sm text-zinc-400 mt-2">CLIProxyAPI Plus Cloudflare 版</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Worker 地址 (URL)</label>
              <input
                type="url"
                required
                value={workerUrl}
                onChange={(e) => setWorkerUrl(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                placeholder="https://your-worker.workers.dev"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">管理密码</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                placeholder="输入您的 ADMIN_PASSWORD"
              />
            </div>

            {authError && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-white text-black font-medium rounded-xl px-4 py-3 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin" /> : '登录'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Terminal className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">CLIProxyAPI Plus</h1>
              <p className="text-xs text-zinc-400 font-mono">Cloudflare Worker 版本</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/router-for-me/CLIProxyAPIPlus"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <Code className="w-4 h-4" />
              源码
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Instructions */}
        <div className="lg:col-span-7 space-y-8">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 rounded-2xl border border-white/5 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Server className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-semibold tracking-tight">部署指南</h2>
            </div>
            
            <div className="space-y-6 text-zinc-300">
              <p className="leading-relaxed">
                本项目提供了 <strong>CLIProxyAPI Plus</strong> 的 Cloudflare Worker 实现。
                它作为一个代理，为 CLI 模型（如 Claude Code、Cline、Roo Code）提供兼容 OpenAI 的 API 接口，
                支持 GLM-4.7、AWS CodeWhisperer (Kiro) 和 Codex (GitHub Copilot)。
              </p>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">1. 获取 Worker 代码</h3>
                <p className="text-sm">Cloudflare Worker 代码已在您的工作区 <code>cf-worker</code> 目录下生成。</p>
                <div className="bg-zinc-950 rounded-xl border border-white/10 p-4 font-mono text-sm overflow-x-auto">
                  <div className="flex items-center justify-between mb-2 text-zinc-500">
                    <span>cf-worker/index.ts</span>
                  </div>
                  <code className="text-emerald-300">import &#123; Hono &#125; from 'hono';<br/>// ... 在工作区查看完整文件</code>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">2. 部署到 Cloudflare</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
                  <li>进入 worker 目录: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">cd cf-worker</code></li>
                  <li>安装依赖: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npm install</code></li>
                  <li>登录 Cloudflare: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npx wrangler login</code></li>
                  <li>创建 KV 命名空间: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npx wrangler kv:namespace create "TOKENS"</code></li>
                  <li>使用您的 KV ID 更新 <code className="bg-zinc-800 px-1.5 py-0.5 rounded">wrangler.toml</code></li>
                  <li>设置密钥: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npx wrangler secret put KIRO_CLIENT_SECRET</code></li>
                  <li>设置管理密码: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npx wrangler secret put ADMIN_PASSWORD</code></li>
                  <li>部署: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npm run deploy</code></li>
                </ol>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-lg font-medium text-white">3. GitHub Actions 自动部署 (可选)</h3>
                <p className="text-sm">如果您想使用 GitHub Actions 自动部署，请按以下步骤操作：</p>
                <ol className="list-decimal list-inside space-y-3 text-sm ml-2 text-zinc-300">
                  <li>
                    <strong>创建工作流文件：</strong> 在您的 GitHub 仓库中，点击 <code>Add file</code> -&gt; <code>Create new file</code>。
                    <br />文件路径输入：<code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">.github/workflows/deploy.yml</code>
                    <br />将以下内容粘贴进去并提交：
                    <div className="mt-2 bg-zinc-950 rounded-xl border border-white/10 p-4 font-mono text-xs overflow-x-auto text-zinc-400">
<pre><code>{`name: Deploy Worker
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: 'cf-worker'
          secrets: |
            KIRO_CLIENT_SECRET
            ADMIN_PASSWORD`}</code></pre>
                    </div>
                  </li>
                  <li>
                    <strong>添加 Secrets：</strong> 进入仓库的 <code>Settings</code> -&gt; 左侧菜单 <code>Secrets and variables</code> -&gt; <code>Actions</code>。
                    <br />点击 <strong>New repository secret</strong>，添加以下四个变量：
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-zinc-400">
                      <li><code>CLOUDFLARE_ACCOUNT_ID</code>: 您的 Cloudflare 账户 ID</li>
                      <li><code>CLOUDFLARE_API_TOKEN</code>: Cloudflare API 令牌 (需包含 Workers 脚本、KV 存储、路由的编辑权限)</li>
                      <li><code>KIRO_CLIENT_SECRET</code>: Kiro (AWS) 的 OAuth 密钥</li>
                      <li><code>ADMIN_PASSWORD</code>: 您自定义的管理页面密码</li>
                    </ul>
                  </li>
                </ol>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900 rounded-2xl border border-white/5 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-6 h-6 text-cyan-400" />
              <h2 className="text-2xl font-semibold tracking-tight">Kiro 认证</h2>
            </div>
            
            <p className="text-zinc-400 text-sm mb-6">
              访问 Kiro (AWS CodeWhisperer) OAuth 网页认证界面以生成您的代理令牌。
            </p>

            <div className="bg-zinc-950 rounded-xl border border-white/10 p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-2">
                <img src="https://assets.router-for.me/chinese-5-0.jpg" alt="GLM" className="w-10 h-10 object-cover rounded-full opacity-50 grayscale" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">网页端 OAuth 登录</h3>
                <p className="text-sm text-zinc-500 mt-1">连接您的 AWS Builder ID 或 Identity Center</p>
              </div>
              <a
                href={`${workerUrl}/v0/oauth/kiro`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 px-6 py-2.5 bg-white text-black font-medium rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-2"
              >
                使用 Kiro 登录
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.section>
        </div>

        {/* Right Column - Configuration */}
        <div className="lg:col-span-5 space-y-8">
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900 rounded-2xl border border-white/5 p-8 sticky top-24"
          >
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-5 h-5 text-zinc-400" />
              <h2 className="text-xl font-medium">配置</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Worker 地址 (URL)</label>
                <input
                  type="text"
                  value={workerUrl}
                  onChange={(e) => setWorkerUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                  placeholder="https://your-worker.workers.dev"
                />
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <h3 className="text-sm font-medium text-zinc-400">AI 编程工具设置</h3>
                
                <div className="space-y-3">
                  <div className="bg-zinc-950 rounded-xl border border-white/10 p-4">
                    <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">API 基础地址 (Base URL)</div>
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-emerald-300 font-mono">{workerUrl}/v1</code>
                      <button onClick={() => handleCopy(`${workerUrl}/v1`)} className="text-zinc-500 hover:text-white transition-colors">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-950 rounded-xl border border-white/10 p-4">
                    <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">模型名称 (Model)</div>
                    <code className="text-sm text-cyan-300 font-mono">glm-4.7</code>
                    <span className="text-zinc-600 mx-2">或</span>
                    <code className="text-sm text-cyan-300 font-mono">kiro-claude-3-5-sonnet</code>
                    <span className="text-zinc-600 mx-2">或</span>
                    <code className="text-sm text-cyan-300 font-mono">codex</code>
                  </div>

                  <div className="bg-zinc-950 rounded-xl border border-white/10 p-4">
                    <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">API 密钥 (API Key)</div>
                    <div className="text-sm text-zinc-400">
                      使用从 <strong className="text-white">Kiro 认证</strong> 流程生成的令牌，或者您的 GLM API Key。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

