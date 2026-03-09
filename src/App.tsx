/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Server, Key, Terminal, Code, Settings, ExternalLink, Copy, Check, Lock, Loader2, BookOpen, LogOut, Plus, Trash2, AlertCircle } from 'lucide-react';

export default function App() {
  const [workerUrl, setWorkerUrl] = useState('https://your-worker.workers.dev');
  const [copied, setCopied] = useState(false);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dashboard State
  const [activeTab, setActiveTab] = useState<'guide' | 'tokens' | 'config'>('guide');
  const [tokens, setTokens] = useState<{name: string, value: string}[]>([]);
  const [config, setConfig] = useState<{name: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemValue, setNewItemValue] = useState('');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBaseUrl = () => workerUrl.endsWith('/') ? workerUrl.slice(0, -1) : workerUrl;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError('');
    
    try {
      const response = await fetch(`${getBaseUrl()}/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        setActiveTab('tokens');
      } else {
        setAuthError(data.error || '密码错误');
      }
    } catch (err) {
      setAuthError('无法连接到 Worker，请检查 Worker 地址是否正确。');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setTokens([]);
    setConfig([]);
  };

  const fetchData = async (type: 'tokens' | 'config') => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseUrl()}/admin/${type}`, {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      const data = await response.json();
      if (data.success) {
        if (type === 'tokens') setTokens(data.tokens);
        else setConfig(data.config);
      }
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'tokens') fetchData('tokens');
      if (activeTab === 'config') fetchData('config');
    }
  }, [isAuthenticated, activeTab]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemValue) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseUrl()}/admin/${activeTab}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ name: newItemName, value: newItemValue })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewItemName('');
        setNewItemValue('');
        fetchData(activeTab as 'tokens' | 'config');
      }
    } catch (error) {
      console.error(`Failed to add ${activeTab}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (name: string) => {
    if (!confirm(`确定要删除 ${name} 吗？`)) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${getBaseUrl()}/admin/${activeTab}/${name}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` }
      });
      
      const data = await response.json();
      if (data.success) {
        fetchData(activeTab as 'tokens' | 'config');
      }
    } catch (error) {
      console.error(`Failed to delete ${activeTab}:`, error);
    } finally {
      setIsLoading(false);
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
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{authError}</span>
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
              <p className="text-xs text-zinc-400 font-mono">管理控制台 (CPAMC)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-2 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-2">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'tokens' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Key className="w-5 h-5" />
            Tokens 管理
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'config' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Settings className="w-5 h-5" />
            系统配置
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'guide' ? 'bg-white/10 text-white border border-white/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            部署指南
          </button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-6">
          
          {(activeTab === 'tokens' || activeTab === 'config') && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-zinc-900 rounded-2xl border border-white/5 p-6">
                <h2 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2">
                  {activeTab === 'tokens' ? <Key className="w-5 h-5 text-emerald-400" /> : <Settings className="w-5 h-5 text-cyan-400" />}
                  {activeTab === 'tokens' ? '添加 Token' : '添加配置'}
                </h2>
                <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={activeTab === 'tokens' ? "Token 名称 (如: kiro_user1)" : "配置键名"}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                  />
                  <input
                    type="text"
                    required
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(e.target.value)}
                    placeholder={activeTab === 'tokens' ? "Token 值 (真实 API Key)" : "配置值"}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-white text-black font-medium rounded-xl px-6 py-2.5 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </form>
              </div>

              <div className="bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {activeTab === 'tokens' ? '已保存的 Tokens' : '已保存的配置'}
                  </h2>
                  {isLoading && <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-950/50 text-zinc-400">
                      <tr>
                        <th className="px-6 py-4 font-medium">名称 (Key)</th>
                        <th className="px-6 py-4 font-medium">值 (Value)</th>
                        <th className="px-6 py-4 font-medium text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(activeTab === 'tokens' ? tokens : config).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">
                            暂无数据
                          </td>
                        </tr>
                      ) : (
                        (activeTab === 'tokens' ? tokens : config).map((item) => (
                          <tr key={item.name} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4 font-mono text-emerald-300">{item.name}</td>
                            <td className="px-6 py-4 font-mono text-zinc-400 truncate max-w-[200px]">
                              {item.value.length > 20 ? `${item.value.substring(0, 20)}...` : item.value}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteItem(item.name)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'guide' && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <section className="bg-zinc-900 rounded-2xl border border-white/5 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Server className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-2xl font-semibold tracking-tight">部署指南</h2>
                </div>
                
                <div className="space-y-6 text-zinc-300">
                  <p className="leading-relaxed">
                    本项目提供了 <strong>CLIProxyAPI Plus</strong> 的 Cloudflare Worker 实现。
                    它作为一个代理，为 CLI 模型（如 Claude Code、Cline、Roo Code）提供兼容 OpenAI 的 API 接口。
                  </p>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">1. 获取 Worker 代码</h3>
                    <p className="text-sm">Cloudflare Worker 代码已在您的工作区 <code>cf-worker</code> 目录下生成。</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">2. 部署到 Cloudflare</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
                      <li>进入 worker 目录: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">cd cf-worker</code></li>
                      <li>安装依赖: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npm install</code></li>
                      <li>登录 Cloudflare: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npx wrangler login</code></li>
                      <li>创建 KV 命名空间: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npx wrangler kv:namespace create "TOKENS"</code></li>
                      <li>使用您的 KV ID 更新 <code className="bg-zinc-800 px-1.5 py-0.5 rounded">wrangler.toml</code></li>
                      <li>设置管理密码: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npx wrangler secret put ADMIN_PASSWORD</code></li>
                      <li>部署: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">npx wrangler@latest deploy</code></li>
                    </ol>
                  </div>
                </div>
              </section>

              <section className="bg-zinc-900 rounded-2xl border border-white/5 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-xl font-medium">客户端配置参考</h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-zinc-950 rounded-xl border border-white/10 p-4">
                    <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-semibold">API 基础地址 (Base URL)</div>
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-emerald-300 font-mono">{getBaseUrl()}/v1</code>
                      <button onClick={() => handleCopy(`${getBaseUrl()}/v1`)} className="text-zinc-500 hover:text-white transition-colors">
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
                </div>
              </section>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}

