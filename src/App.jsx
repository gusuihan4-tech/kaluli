import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [mealType, setMealType] = useState('breakfast');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ todayTotal: 0, todayCount: 0, totalCount: 0 });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  // 加载历史记录与统计
  useEffect(() => {
    loadHistory();
    updateStats();
    
    // PWA install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    // 尝试在上线时将离线队列中的分析请求发送出去
    const onOnline = () => {
      flushPendingAnalyses();
    };
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const loadHistory = () => {
    const logs = JSON.parse(localStorage.getItem('food_logs') || '[]');
    setHistory(logs);
  };

  const updateStats = () => {
    const logs = JSON.parse(localStorage.getItem('food_logs') || '[]');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayLogs = logs.filter(l => l.t >= todayStart);
    const todayTotal = todayLogs.reduce((s, l) => s + (l.total || 0), 0);
    const todayMeals = new Set(todayLogs.map(l => l.meal)).size;
    setStats({ todayTotal, todayCount: todayMeals, totalCount: logs.length });
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setResult(null);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 将分析请求加入本地离线队列
  const enqueueAnalysis = (dataUrl) => {
    const q = JSON.parse(localStorage.getItem('pending_analyses') || '[]');
    q.push({ id: Date.now(), image: dataUrl });
    localStorage.setItem('pending_analyses', JSON.stringify(q));
    setResult({ info: `已加入离线队列，待网络恢复自动发送（队列长度 ${q.length}）` });
  };

  // 发送单次分析请求（返回解析后的数据或抛错）
  const sendAnalyzeRequest = async (dataUrl) => {
    const resp = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Server error ${resp.status}: ${errText}`);
    }
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || '分析失败');
    return data;
  };

  // 处理在线或离线分析请求：若在线则直接发送，失败或离线则入队
  const handleAnalyze = async () => {
    if (!file) {
      alert('请先选择或拍摄一张食物照片');
      return;
    }

    setAnalyzing(true);
    try {
      const dataUrl = await fileToBase64(file);
      if (!navigator.onLine) {
        enqueueAnalysis(dataUrl);
        return;
      }

      try {
        const data = await sendAnalyzeRequest(dataUrl);
        const predictions = data.predictions || [];
        if (predictions.length === 0) {
          setResult({ error: '⚠️ 未检测到食物。请确保照片清晰。' });
        } else {
          setResult({ success: true, predictions });
        }
      } catch (err) {
        // 网络或服务器出错，入队以便稍后重试
        console.error('分析失败，入队重试：', err);
        enqueueAnalysis(dataUrl);
      }
    } catch (err) {
      console.error(err);
      setResult({ error: `❌ 错误：${err.message}` });
    } finally {
      setAnalyzing(false);
    }
  };

  // 将本地队列中的分析请求逐个发送（在线时触发）
  const flushPendingAnalyses = async () => {
    const q = JSON.parse(localStorage.getItem('pending_analyses') || '[]');
    if (!q.length) return;
    let remaining = [...q];
    for (const item of q) {
      try {
        await sendAnalyzeRequest(item.image);
        remaining = remaining.slice(1);
        localStorage.setItem('pending_analyses', JSON.stringify(remaining));
      } catch (err) {
        console.error('重发失败，停止并等待下次尝试：', err);
        break;
      }
    }
  };

  const handleSave = () => {
    if (!result?.predictions) return;

    const items = result.predictions.map(p => ({
      name: p.name,
      calories: p.calories || 0,
    }));
    const total = items.reduce((s, i) => s + (i.calories || 0), 0);

    const logs = JSON.parse(localStorage.getItem('food_logs') || '[]');
    logs.push({ t: Date.now(), meal: mealType, items, total });
    localStorage.setItem('food_logs', JSON.stringify(logs));

    setResult(null);
    setFile(null);
    setPreview(null);
    loadHistory();
    updateStats();
  };

  const deleteHistory = (idx) => {
    const logs = JSON.parse(localStorage.getItem('food_logs') || '[]');
    logs.splice(idx, 1);
    localStorage.setItem('food_logs', JSON.stringify(logs));
    loadHistory();
    updateStats();
  };

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('PWA installed');
        }
        setDeferredPrompt(null);
        setShowInstall(false);
      });
    }
  };

  const formatMealType = (meal) => {
    const map = { breakfast: '🌅 早餐', lunch: '☀️ 午餐', dinner: '🌙 晚餐', snack: '🍪 零食', late: '🌃 夜宵' };
    return map[meal] || meal;
  };

  return (
    <div className="app">
      {showInstall && (
        <div className="install-prompt">
          <strong>💾 安装为 App</strong>
          <p>可以离线使用，添加到主屏幕</p>
          <button onClick={handleInstall}>安装</button>
        </div>
      )}

      <div className="header">
        <h1>🍎 食物卡路里记录</h1>
        <small>拍照识别，智能统计</small>
      </div>

      <div className="section">
        <h2>📸 上传食物照片</h2>
        <label htmlFor="file" className="file-btn">选择或拍照</label>
        <input
          id="file"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {preview && <img src={preview} alt="preview" className="preview" />}
      </div>

      <div className="section">
        <h2>⚡ 分析与保存</h2>
        <div className="controls">
          <button className="primary" onClick={handleAnalyze} disabled={analyzing || !file}>
            {analyzing ? '🔄 分析中…' : '🔍 分析'}
          </button>
          <button className="secondary" onClick={handleSave} disabled={!result?.predictions}>
            ✅ 保存
          </button>
          <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="meal-select">
            <option value="breakfast">🌅 早餐</option>
            <option value="lunch">☀️ 午餐</option>
            <option value="dinner">🌙 晚餐</option>
            <option value="snack">🍪 零食</option>
            <option value="late">🌃 夜宵</option>
          </select>
        </div>
        <h3>识别结果</h3>
        <div className="result">
          {!result ? (
            <span>等待上传...</span>
          ) : result.error ? (
            <span className="error">{result.error}</span>
          ) : (
            <ul>
              {result.predictions?.map((p, i) => (
                <li key={i}>
                  {p.name} {p.calories ? `(${p.calories} kcal)` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="section">
        <h2>📊 统计</h2>
        <div className="stats">
          <div className="stat">
            <div className="stat-number">{stats.todayTotal}</div>
            <div className="stat-label">今日卡路里</div>
          </div>
          <div className="stat">
            <div className="stat-number">{stats.todayCount}</div>
            <div className="stat-label">今日餐次</div>
          </div>
          <div className="stat">
            <div className="stat-number">{stats.totalCount}</div>
            <div className="stat-label">总记录数</div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>📝 历史记录</h2>
        {history.length === 0 ? (
          <p className="empty">暂无记录</p>
        ) : (
          <ul className="history-list">
            {[...history].reverse().map((l, idx) => {
              const date = new Date(l.t);
              const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString('zh-CN');
              return (
                <li key={idx} className="history-item">
                  <div>{formatMealType(l.meal)}</div>
                  <div>
                    {l.items.map((i, j) => (
                      <div key={j}>
                        <span className="item-name">{i.name}</span>
                        <span className="item-cal">{i.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                  <small>{dateStr} {timeStr} — 总计 <strong>{l.total} kcal</strong></small>
                  <button
                    className="delete-btn"
                    onClick={() => deleteHistory(history.length - idx - 1)}
                  >
                    删除
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
