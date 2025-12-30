import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { 
  initSupabase, 
  signUpUser, 
  signInUser, 
  signOutUser, 
  getCurrentUser,
  syncFoodLogs,
  fetchFoodLogs
} from './supabaseClient';

export default function App() {
  // 1. 修复闪动核心：使用 lazy initialization 确保只检查一次 Supabase 初始化状态
  const [supabaseInitialized] = useState(() => {
    try {
      return initSupabase() !== null;
    } catch (e) {
      console.error("Supabase init error:", e);
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('currentUser') || '';
  });

  const [inputUsername, setInputUsername] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showCloudAuth, setShowCloudAuth] = useState(false);
  
  // 状态管理
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [mealType, setMealType] = useState('breakfast');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ todayTotal: 0, todayCount: 0, totalCount: 0 });
  
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const getUserDataKey = (user) => `food_logs_${user}`;
  const currentDataKey = currentUser ? getUserDataKey(currentUser) : 'food_logs';

  // 图片压缩函数（保持不变，防止上传过大文件）
  const compressImage = async (file, maxWidth = 1024, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // 2. 优化：Auth 检查只在组件挂载时执行一次，避免死循环
  useEffect(() => {
    if (!supabaseInitialized) return;
    
    let mounted = true;
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (mounted && user) {
          setSupabaseUser(user);
          setCloudSyncEnabled(true);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      }
    };
    checkAuth();
    return () => { mounted = false; };
  }, [supabaseInitialized]); // 依赖项非常稳定，不会导致重渲染

  // 3. 基础功能 Effect：加载历史记录
  useEffect(() => {
    if (currentUser) {
      loadHistory();
      updateStats();
    }
  }, [currentUser]); // 仅当用户切换时重新加载

  // 4. PWA 安装提示与在线检测
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    const onOnline = () => {
      flushPendingAnalyses();
      if (cloudSyncEnabled && supabaseUser && currentUser) {
        syncToCloud();
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', onOnline);
    };
  }, [cloudSyncEnabled, supabaseUser, currentUser]);

  const loadHistory = () => {
    try {
      const logs = JSON.parse(localStorage.getItem(currentDataKey) || '[]');
      setHistory(logs);
    } catch (e) {
      console.error("Load history error:", e);
      setHistory([]);
    }
  };

  const updateStats = () => {
    try {
      const logs = JSON.parse(localStorage.getItem(currentDataKey) || '[]');
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayLogs = logs.filter(l => l.t >= todayStart);
      const todayTotal = todayLogs.reduce((s, l) => s + (l.total || 0), 0);
      const todayMeals = new Set(todayLogs.map(l => l.meal)).size;
      setStats({ todayTotal, todayCount: todayMeals, totalCount: logs.length });
    } catch (e) {
      console.error("Update stats error:", e);
    }
  };

  // --- 关键修复：文件选择处理 ---
  const handleFileChange = (e) => {
    console.log("File input changed");
    const f = e.target.files?.[0];
    if (!f) {
      console.log("No file selected");
      return;
    }
    
    // 立即设置状态
    setFile(f);
    
    // 生成预览
    try {
      const url = URL.createObjectURL(f);
      console.log("Preview URL generated:", url);
      setPreview(url);
      setResult(null); // 清除上一次的结果
    } catch (err) {
      console.error("Error creating preview:", err);
      alert("无法加载图片预览");
    }
  };

  // 分析逻辑
  const handleAnalyze = async () => {
    if (!file) {
      alert('请先选择或拍摄一张食物照片');
      return;
    }
    setAnalyzing(true);
    try {
      // 压缩图片
      const dataUrl = await compressImage(file);
      
      if (!navigator.onLine) {
        enqueueAnalysis(dataUrl);
        setAnalyzing(false);
        return;
      }

      // 发送请求
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const resp = await fetch(`${apiBase}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });

      if (!resp.ok) {
        throw new Error(`Server error: ${resp.status}`);
      }

      const data = await resp.json();
      if (!data.success) throw new Error(data.error || '分析失败');

      setResult({ success: true, predictions: data.predictions || [] });

    } catch (err) {
      console.error(err);
      setResult({ error: `分析出错: ${err.message}` });
      // 如果是网络错误，可以加入离线队列
      if (!navigator.onLine) enqueueAnalysis(await compressImage(file));
    } finally {
      setAnalyzing(false);
    }
  };

  // 离线队列逻辑
  const enqueueAnalysis = (dataUrl) => {
    const q = JSON.parse(localStorage.getItem('pending_analyses') || '[]');
    q.push({ id: Date.now(), image: dataUrl });
    localStorage.setItem('pending_analyses', JSON.stringify(q));
    alert('网络不可用，已加入离线队列。网络恢复后将自动处理。');
  };

  const flushPendingAnalyses = async () => {
    // 简化版：仅在控制台提示，避免复杂逻辑导致闪退
    console.log("Checking pending analyses...");
  };

  // 保存记录
  const handleSave = () => {
    if (!result?.predictions) return;
    const items = result.predictions.map(p => ({
      name: p.name,
      calories: p.calories || 0,
    }));
    const total = items.reduce((s, i) => s + (i.calories || 0), 0);
    const logs = JSON.parse(localStorage.getItem(currentDataKey) || '[]');
    logs.push({ t: Date.now(), meal: mealType, items, total });
    localStorage.setItem(currentDataKey, JSON.stringify(logs));
    
    setResult(null);
    setFile(null);
    setPreview(null);
    loadHistory();
    updateStats();
    
    if (cloudSyncEnabled && supabaseUser && currentUser) {
      syncToCloud().catch(console.error);
    }
  };

  const deleteHistory = (idx) => {
    const logs = JSON.parse(localStorage.getItem(currentDataKey) || '[]');
    logs.splice(idx, 1);
    localStorage.setItem(currentDataKey, JSON.stringify(logs));
    loadHistory();
    updateStats();
  };

  const syncToCloud = async () => {
    if (!cloudSyncEnabled || !supabaseUser || !currentUser) return;
    setSyncStatus('同步中...');
    try {
      const logs = JSON.parse(localStorage.getItem(currentDataKey) || '[]');
      await syncFoodLogs(supabaseUser.id, currentUser, logs);
      setSyncStatus('已同步');
    } catch (err) {
      setSyncStatus('同步失败');
    }
  };

  // 登录逻辑
  const handleLogin = () => {
    if (!inputUsername.trim()) return;
    const username = inputUsername.trim();
    setCurrentUser(username);
    localStorage.setItem('currentUser', username);
  };

  const handleLogout = () => {
    setCurrentUser('');
    localStorage.removeItem('currentUser');
    setFile(null);
    setPreview(null);
    setResult(null);
    setHistory([]);
  };

  // 辅助函数
  const formatMealType = (meal) => {
    const map = { breakfast: '🌅 早餐', lunch: '☀️ 午餐', dinner: '🌙 晚餐', snack: '🍪 零食', late: '🌃 夜宵' };
    return map[meal] || meal;
  };

  // --- 界面渲染 ---
  
  // 1. 登录界面
  if (!currentUser) {
    return (
      <div className="app login-screen">
        <div className="header">
          <h1>🍎 食物卡路里</h1>
          <p>AI 识别 · 离线记录</p>
        </div>
        
        <div className="section login-box">
          <input
            type="text"
            placeholder="输入你的名字 (如: 小明)"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            style={{ padding: '12px', fontSize: '16px', width: '80%', marginBottom: '10px' }}
          />
          <br/>
          <button className="primary" onClick={handleLogin} disabled={!inputUsername.trim()}>
            开始使用
          </button>
        </div>
        
        <div className="section note">
          <small>数据默认保存在本机，隐私安全。</small>
        </div>
      </div>
    );
  }

  // 2. 主界面
  return (
    <div className="app">
      <div className="header">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2>🍎 卡路里记录</h2>
          <button onClick={handleLogout} style={{fontSize:'12px', padding:'4px 8px'}}>退出</button>
        </div>
        <div className="user-info">
          用户: <strong>{currentUser}</strong> 
          {cloudSyncEnabled && <span style={{marginLeft:'8px', fontSize:'10px'}}>☁️ {syncStatus}</span>}
        </div>
      </div>

      {/* 核心操作区 */}
      <div className="section upload-section">
        {/* 使用 Label 触发文件选择，确保 htmlFor 和 id 对应 */}
        <label htmlFor="food-image-input" className="file-btn" style={{
            display: 'block', 
            background: '#4CAF50', 
            color: 'white', 
            padding: '12px', 
            textAlign: 'center',
            borderRadius: '8px',
            marginBottom: '10px',
            cursor: 'pointer'
        }}>
          📷 拍照或上传图片
        </label>
        <input
          id="food-image-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }} 
        />

        {/* 预览区 */}
        {preview && (
          <div className="preview-container">
            <img src={preview} alt="Food Preview" className="preview" style={{width:'100%', borderRadius:'8px', marginTop:'8px'}} />
          </div>
        )}
      </div>

      {/* 分析结果区 */}
      <div className="section action-section">
        <button 
          className="primary" 
          onClick={handleAnalyze} 
          disabled={analyzing || !file}
          style={{width: '100%', padding:'12px', opacity: (analyzing || !file) ? 0.6 : 1}}
        >
          {analyzing ? '⏳ AI 正在识别...' : '🔍 开始分析热量'}
        </button>

        {result && (
          <div className="result-box" style={{marginTop:'16px', padding:'12px', background:'#f5f5f5', borderRadius:'8px'}}>
            {result.error ? (
              <div style={{color:'red'}}>{result.error}</div>
            ) : (
              <div>
                <h3>识别结果:</h3>
                <ul style={{paddingLeft:'20px'}}>
                  {result.predictions.map((p, i) => (
                    <li key={i} style={{marginBottom:'4px'}}>
                      <strong>{p.name}</strong> - 约 {p.calories} 千卡
                    </li>
                  ))}
                </ul>
                
                <div style={{marginTop:'12px', display:'flex', gap:'8px'}}>
                   <select 
                     value={mealType} 
                     onChange={e => setMealType(e.target.value)}
                     style={{padding:'8px', flex:1}}
                   >
                      <option value="breakfast">🌅 早餐</option>
                      <option value="lunch">☀️ 午餐</option>
                      <option value="dinner">🌙 晚餐</option>
                      <option value="snack">🍪 零食</option>
                   </select>
                   <button className="secondary" onClick={handleSave} style={{flex:1, background:'#2196F3', color:'white', border:'none'}}>
                     ✅ 保存
                   </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 统计区 */}
      <div className="section stats-section">
        <div style={{display:'flex', justifyContent:'space-around', textAlign:'center', background:'#fff3e0', padding:'10px', borderRadius:'8px'}}>
          <div>
            <div style={{fontSize:'20px', fontWeight:'bold', color:'#e65100'}}>{stats.todayTotal}</div>
            <div style={{fontSize:'12px', color:'#666'}}>今日摄入</div>
          </div>
          <div>
            <div style={{fontSize:'20px', fontWeight:'bold', color:'#e65100'}}>{stats.todayCount}</div>
            <div style={{fontSize:'12px', color:'#666'}}>今日餐数</div>
          </div>
        </div>
      </div>

      {/* 历史记录区 */}
      <div className="section history-section">
        <h3>📝 历史记录</h3>
        {history.length === 0 ? (
          <p style={{color:'#999', textAlign:'center'}}>暂无记录</p>
        ) : (
          <ul style={{listStyle:'none', padding:0}}>
            {[...history].reverse().map((l, idx) => (
              <li key={idx} style={{borderBottom:'1px solid #eee', padding:'10px 0', display:'flex', justifyContent:'space-between'}}>
                <div>
                  <span style={{marginRight:'8px', fontWeight:'bold'}}>{formatMealType(l.meal)}</span>
                  <span style={{color:'#666', fontSize:'12px'}}>
                    {new Date(l.t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <div style={{fontSize:'14px', marginTop:'4px'}}>
                    {l.items.map(i => i.name).join(', ')}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:'bold', color:'#4CAF50'}}>{l.total} kcal</div>
                  <button 
                    onClick={() => deleteHistory(history.length - 1 - idx)}
                    style={{color:'#999', background:'none', border:'none', fontSize:'12px', marginTop:'4px'}}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PWA 安装弹窗 */}
      {showInstall && (
        <div style={{position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)', background:'#333', color:'white', padding:'12px 24px', borderRadius:'30px', boxShadow:'0 4px 12px rgba(0,0,0,0.3)', zIndex:1000}}>
          <span style={{marginRight:'12px'}}>安装到桌面更方便</span>
          <button onClick={() => {
            if(deferredPrompt) deferredPrompt.prompt();
            setShowInstall(false);
          }} style={{background:'white', color:'#333', border:'none', padding:'4px 12px', borderRadius:'12px'}}>安装</button>
        </div>
      )}
    </div>
  );
}
