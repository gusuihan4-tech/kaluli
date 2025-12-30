export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    console.log(`[Worker] ${request.method} ${url.pathname}`);
    console.log(`[Worker] env.MOCK = ${env.MOCK}`);

    // 只处理 /api/analyze POST 请求
    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      return handleAnalyze(request, env);
    }

    // 其他请求返回 404
    return jsonResponse({ error: 'Not Found' }, 404);
  },
};

async function handleAnalyze(request, env) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      console.error('JSON parse error:', e);
      return jsonResponse({ success: false, error: 'Invalid JSON in request body' }, 400);
    }

    const { image } = body;
    if (!image) {
      return jsonResponse({ success: false, error: 'No image provided in body' }, 400);
    }

    // 检查 mock 模式（从 env 变量或 URL 查询参数）
    const url = new URL(request.url);
    const mockParam = url.searchParams.get('mock') === 'true';
    const mockEnv = String(env.MOCK || '').toLowerCase() === 'true';
    const mock = mockParam || mockEnv;
    
    console.log(`[handleAnalyze] mockParam=${mockParam}, mockEnv=${mockEnv}, env.MOCK="${env.MOCK}", mock=${mock}`);
    
    if (mock) {
      console.log('[handleAnalyze] Returning mock response');
      return jsonResponse({
        success: true,
        predictions: [
          { name: 'Apple', calories: 95, confidence: 0.98, portion_g: 150 },
          { name: 'Orange Juice', calories: 110, confidence: 0.85, portion_g: 200 }
        ]
      });
    }

    // 调用 DeepSeek 真实 API
    const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY || '';
    if (!DEEPSEEK_API_KEY) {
      console.error('DEEPSEEK_API_KEY not found in environment');
      return jsonResponse({ success: false, error: 'DEEPSEEK_API_KEY not configured' }, 500);
    }

    // 提取 base64 数据（支持 data:image/jpeg;base64,... 格式或纯 base64）
    const base64 = image.includes(',') ? image.split(',')[1] : image;

    // 调用 DeepSeek API
    // 注意：请根据 DeepSeek 官方文档调整 endpoint 与请求体格式
    const deepseekEndpoint = 'https://api.deepseek.com/v1/vision/image-analyze';
    
    console.log('Calling DeepSeek API...');
    
    const response = await fetch(deepseekEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: base64,
        model: 'vision',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`DeepSeek API error: ${response.status}`, errText);
      return jsonResponse({ 
        success: false, 
        error: `DeepSeek API error ${response.status}: ${errText.substring(0, 100)}` 
      }, 502);
    }

    const data = await response.json();
    console.log('DeepSeek response received');

    // 规范化响应结构
    let predictions = data.predictions || data.outputs || data.results || data.items || [];
    if (!Array.isArray(predictions)) {
      predictions = [data];
    }

    const normalized = predictions.map(p => ({
      name: p.name || p.label || p.title || 'Unknown',
      calories: p.calories || p.kcal || null,
      confidence: p.confidence || p.score || null,
      portion_g: p.grams || p.portion_g || null,
    }));

    return jsonResponse({ success: true, predictions: normalized });
  } catch (err) {
    console.error('handleAnalyze error:', err.message);
    return jsonResponse({ 
      success: false, 
      error: err.message || 'Analysis failed' 
    }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
