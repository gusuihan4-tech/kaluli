export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ success: false, error: 'Invalid JSON' }, 400);
    }

    const { image } = body;
    if (!image) {
      return jsonResponse({ success: false, error: 'No image provided' }, 400);
    }

    // Mock 逻辑
    const mock = urlParam(request, 'mock') === 'true' || env.MOCK === 'true';
    if (mock) {
      return jsonResponse({
        success: true,
        predictions: [
          { name: 'Mock Apple', calories: 95, confidence: 0.99, portion_g: 150 },
          { name: 'Mock Bread', calories: 200, confidence: 0.95, portion_g: 80 }
        ]
      });
    }

    // 1. 获取配置
    // 注意：在 Pages Functions 中，环境变量通过 env 获取，需要在 Pages 设置里添加
    const API_KEY = env.AI_API_KEY || env.DEEPSEEK_API_KEY; 
    const API_BASE = env.AI_BASE_URL || 'https://api.openai.com/v1'; 
    const MODEL = env.AI_MODEL_NAME || 'gpt-4o-mini'; 

    if (!API_KEY) {
      return jsonResponse({ success: false, error: 'Server configuration error: AI_API_KEY missing' }, 500);
    }

    // 2. 处理图片数据 (移除 data:image/xxx;base64, 前缀)
    const base64Image = image.includes(',') ? image.split(',')[1] : image;

    // 3. 构建 Prompt
    const systemPrompt = `
      You are an expert nutritionist AI. 
      Analyze the food in the image. Identify the items, estimate portion size in grams, and calculate calories.
      Return ONLY a JSON object with this structure:
      {
        "items": [
          { "name": "Food Name", "calories": 100, "portion_g": 100, "confidence": 0.9 }
        ]
      }
      Do not include markdown formatting like \`\`\`json. Just raw JSON.
    `;

    // 4. 调用 AI API
    const endpoint = `${API_BASE}/chat/completions`;
    
    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image for calorie content." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI API Error:', errText);
      return jsonResponse({ success: false, error: `AI API Error: ${aiResponse.status}` }, 502);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return jsonResponse({ success: false, error: 'Empty response from AI' }, 502);
    }

    // 5. 解析结果
    let result;
    try {
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON Parse Error:', content);
      return jsonResponse({ success: false, error: 'Failed to parse AI response' }, 500);
    }

    // 6. 格式归一化
    const predictions = (result.items || result.predictions || []).map(p => ({
      name: p.name || 'Unknown',
      calories: p.calories || 0,
      confidence: p.confidence || 0,
      portion_g: p.portion_g || 0
    }));

    return jsonResponse({ success: true, predictions });

  } catch (err) {
    console.error('Function Error:', err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function urlParam(request, key) {
  const url = new URL(request.url);
  return url.searchParams.get(key);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json'
    },
  });
}
