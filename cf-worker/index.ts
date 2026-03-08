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

// Admin Verification Endpoint
app.post('/admin/verify', async (c) => {
  try {
    const body = await c.req.json();
    const password = body.password;
    
    // If ADMIN_PASSWORD is not set in environment, default to 'admin123' for testing
    // In production, always set this via `wrangler secret put ADMIN_PASSWORD`
    const expectedPassword = c.env.ADMIN_PASSWORD || 'admin123';
    
    if (password === expectedPassword) {
      return c.json({ success: true });
    }
    
    return c.json({ success: false, error: 'Invalid password' }, 401);
  } catch (e) {
    return c.json({ success: false, error: 'Bad request' }, 400);
  }
});

// OpenAI Compatible Chat Completions Endpoint
app.post('/v1/chat/completions', async (c) => {
  const body = await c.req.json();
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Determine provider from token or body model
  const model = body.model || 'glm-4';
  
  if (model.startsWith('glm-')) {
    return handleGLMRequest(c, body, token);
  } else if (model.startsWith('kiro-') || model.startsWith('aws-')) {
    return handleKiroRequest(c, body, token);
  } else if (model.startsWith('codex') || model.includes('copilot')) {
    return handleCodexRequest(c, body, token);
  }

  return c.json({ error: 'Unsupported model' }, 400);
});

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
