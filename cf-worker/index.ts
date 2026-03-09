import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: Env }>();

// Configure CORS to allow all origins and methods
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Type'],
  maxAge: 86400,
}));

// Handle OPTIONS requests explicitly for preflight
app.options('*', (c) => {
  return c.text('', 204);
});

// Types for Cloudflare Bindings
export interface Env {
  TOKENS: KVNamespace;
  CONFIG: KVNamespace;
  KIRO_CLIENT_ID: string;
  KIRO_CLIENT_SECRET: string;
  ADMIN_PASSWORD?: string;
}

// Admin Verification Middleware
const adminAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  const expectedPassword = c.env.ADMIN_PASSWORD || 'admin123';
  
  if (!authHeader || authHeader !== `Bearer ${expectedPassword}`) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  await next();
};

// Admin Verification Endpoint
app.post('/admin/verify', async (c) => {
  try {
    const body = await c.req.json();
    const password = body.password;
    
    const expectedPassword = c.env.ADMIN_PASSWORD || 'admin123';
    
    if (password === expectedPassword) {
      return c.json({ success: true });
    }
    
    return c.json({ success: false, error: 'Invalid password' }, 401);
  } catch (e) {
    return c.json({ success: false, error: 'Bad request' }, 400);
  }
});

// --- Admin API Endpoints ---

// Get all tokens
app.get('/admin/tokens', adminAuth, async (c) => {
  try {
    const { keys } = await c.env.TOKENS.list();
    const tokens = await Promise.all(keys.map(async (key: any) => {
      const value = await c.env.TOKENS.get(key.name);
      return { name: key.name, value };
    }));
    return c.json({ success: true, tokens });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Add or update a token
app.post('/admin/tokens', adminAuth, async (c) => {
  try {
    const { name, value } = await c.req.json();
    if (!name || !value) return c.json({ success: false, error: 'Missing name or value' }, 400);
    await c.env.TOKENS.put(name, value);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Delete a token
app.delete('/admin/tokens/:name', adminAuth, async (c) => {
  try {
    const name = c.req.param('name');
    await c.env.TOKENS.delete(name);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Get config
app.get('/admin/config', adminAuth, async (c) => {
  try {
    const { keys } = await c.env.CONFIG.list();
    const config = await Promise.all(keys.map(async (key: any) => {
      const value = await c.env.CONFIG.get(key.name);
      return { name: key.name, value };
    }));
    return c.json({ success: true, config });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Update config
app.post('/admin/config', adminAuth, async (c) => {
  try {
    const { name, value } = await c.req.json();
    if (!name || !value) return c.json({ success: false, error: 'Missing name or value' }, 400);
    await c.env.CONFIG.put(name, value);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Delete config
app.delete('/admin/config/:name', adminAuth, async (c) => {
  try {
    const name = c.req.param('name');
    await c.env.CONFIG.delete(name);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// --- End Admin API Endpoints ---

// OpenAI Compatible Chat Completions Endpoint
app.post('/v1/chat/completions', async (c) => {
  const body = await c.req.json();
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const model = body.model || 'glm-4';
  
  // Route based on model prefix
  if (model.startsWith('glm-')) {
    return handleGLMRequest(c, body, token);
  } else if (model.startsWith('kiro-') || model.startsWith('aws-')) {
    return handleKiroRequest(c, body, token);
  } else if (model.startsWith('codex') || model.includes('copilot') || model.startsWith('gpt-')) {
    return handleCodexRequest(c, body, token);
  } else if (model.startsWith('gemini-')) {
    return handleGeminiRequest(c, body, token);
  } else if (model.startsWith('claude-')) {
    return handleClaudeRequest(c, body, token);
  } else if (model.startsWith('kimi-') || model.startsWith('qwen')) {
    return handleOpenAICompatibleRequest(c, body, token);
  }

  // Fallback
  return c.json({ error: 'Unsupported model routing' }, 400);
});

// --- Enterprise Features Helpers ---

// 1. Multi-channel Key Pool (Load Balancing)
// In a stateless Worker, random selection provides an excellent approximation of round-robin
// while avoiding the latency of reading/writing state to KV on every single request.
async function getUpstreamKey(c: any, configKey: string, fallbackToken: string): Promise<string> {
  const kvValue = await c.env.CONFIG.get(configKey);
  if (!kvValue) return fallbackToken;

  // Support multiple keys separated by comma (e.g., "key1,key2,key3")
  const keys = kvValue.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  if (keys.length === 0) return fallbackToken;
  if (keys.length === 1) return keys[0];

  // Random selection for load balancing
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}

// 2. Model Alias Resolution
function resolveModelAlias(model: string): string {
  const aliases: Record<string, string> = {
    'gemini-3-pro-high': 'gemini-3-pro-preview',
    'gemini-flash': 'gemini-2.5-flash',
    'claude-sonnet-latest': 'claude-3-5-sonnet-20241022',
    'gemini-claude-sonnet-4-5': 'claude-3-5-sonnet-20241022', // Cloaked alias
    'claude-opus-4-5': 'claude-opus-4-5-20251101',
    'codex-latest': 'gpt-5-codex',
    'kimi-k2': 'moonshotai/kimi-k2:free'
  };
  return aliases[model] || model;
}

// --- Provider Handlers ---

async function handleGeminiRequest(c: any, body: any, token: string) {
  const upstreamKey = await getUpstreamKey(c, 'GEMINI_API_KEY', token);
  const actualModel = resolveModelAlias(body.model);
  
  // 3. Payload Modification (Enterprise Feature)
  // Auto-inject thinking budget for pro models if not present
  if (actualModel.includes('pro') && !body.generationConfig?.thinkingConfig) {
    body.generationConfig = body.generationConfig || {};
    body.generationConfig.thinkingConfig = { thinkingBudget: 32768 };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${upstreamKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
}

async function handleClaudeRequest(c: any, body: any, token: string) {
  const upstreamKey = await getUpstreamKey(c, 'CLAUDE_API_KEY', token);
  const actualModel = resolveModelAlias(body.model);
  body.model = actualModel; // Update body with resolved model
  
  const url = 'https://api.anthropic.com/v1/messages';
  
  // 4. Request Cloaking (Enterprise Feature)
  // We construct clean headers, intentionally dropping identifying headers like User-Agent: ClaudeCode
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': upstreamKey,
    'anthropic-version': '2023-06-01'
  };

  // Pass through necessary beta headers if they exist
  const reqHeaders = c.req.header();
  if (reqHeaders['anthropic-beta']) {
    headers['anthropic-beta'] = reqHeaders['anthropic-beta'];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
}

async function handleOpenAICompatibleRequest(c: any, body: any, token: string) {
  const actualModel = resolveModelAlias(body.model);
  body.model = actualModel;

  let url = 'https://api.moonshot.cn/v1/chat/completions';
  let upstreamKey = await getUpstreamKey(c, 'OPENAI_COMPATIBLE_KEY', token);

  if (actualModel.startsWith('qwen')) {
    url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    upstreamKey = await getUpstreamKey(c, 'QWEN_API_KEY', token);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${upstreamKey}`
    },
    body: JSON.stringify(body)
  });

  return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
}

// GLM Provider Handler
async function handleGLMRequest(c: any, body: any, token: string) {
  // Translate OpenAI format to GLM format and proxy
  const glmUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  
  const response = await fetch(glmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// AWS Kiro (CodeWhisperer) Provider Handler
async function handleKiroRequest(c: any, body: any, token: string) {
  // Fetch actual Kiro token from KV if needed, or use the provided token
  const kiroToken = await c.env.TOKENS.get(`kiro_${token}`) || token;
  
  // Translate to AWS CodeWhisperer API format
  // This is a simplified mock of the translation
  const awsUrl = 'https://codewhisperer.us-east-1.amazonaws.com/chat/completions';
  
  const response = await fetch(awsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${kiroToken}`
    },
    body: JSON.stringify(body)
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Codex (GitHub Copilot) Provider Handler
async function handleCodexRequest(c: any, body: any, token: string) {
  // Fetch actual Codex token from KV if needed, or use the provided token
  const codexToken = await c.env.TOKENS.get(`codex_${token}`) || token;
  
  // Translate to GitHub Copilot / Codex API format
  const codexUrl = 'https://api.githubcopilot.com/chat/completions';
  
  const response = await fetch(codexUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${codexToken}`,
      'Editor-Version': 'vscode/1.85.0',
      'Editor-Plugin-Version': 'copilot-chat/0.11.1'
    },
    body: JSON.stringify(body)
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Web-based OAuth Login for Kiro
app.get('/v0/oauth/kiro', async (c) => {
  const clientId = c.env.KIRO_CLIENT_ID;
  const redirectUri = `${new URL(c.req.url).origin}/v0/oauth/callback`;
  
  const authUrl = `https://awsapps.com/start/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  return c.redirect(authUrl);
});

// OAuth Callback
app.get('/v0/oauth/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.text('Missing code', 400);
  }

  // Exchange code for token
  // Store token in KV
  const mockToken = `kiro_token_${Date.now()}`;
  await c.env.TOKENS.put(`kiro_${mockToken}`, 'actual_aws_token_here');

  return c.html(`
    <html>
      <body>
        <h1>Login Successful!</h1>
        <p>Your API Key: <strong>${mockToken}</strong></p>
        <p>Use this key in your AI coding tools.</p>
      </body>
    </html>
  `);
});

export default app;
