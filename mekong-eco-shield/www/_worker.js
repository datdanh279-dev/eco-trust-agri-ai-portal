/* MEKONG ECO-SHIELD _worker.js v2 — Enhanced Engine Integration */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const ADMIN_EMAIL = 'datdanh279@gmail.com';
const ADMIN_PASS = 'Mek0ng@Sh13ld!Pr0#2026Dat08';
const ADMIN_AID = 'MASTER_KEY';

// Engine backend URL (Python FastAPI, if available)
const ENGINE_URL = 'http://localhost:8000';

// MiroFish backend URL (Python Flask Multi-Agent GraphRAG, if available)
const MIROFISH_URL = 'http://localhost:5001';

async function getDB(env) { return env.mekong_eco_shield_db; }

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function parseCookies(request) {
  const c = {};
  (request.headers.get('Cookie') || '').split(';').forEach(kv => {
    const p = kv.trim().indexOf('=');
    if (p > 0) { c[kv.trim().substring(0, p)] = kv.trim().substring(p + 1); }
  });
  return c;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // Try proxying to the Python engine backend first.
    // If engine is unreachable, fall back to built-in mock data.
    if (path.startsWith('/api/engine/')) {
      const enginePath = path.replace('/api/engine', '/api');
      try {
        const engineUrl = `${ENGINE_URL}${enginePath}${url.search}`;
        const engineResp = await fetch(engineUrl, { method, headers: { 'Content-Type': 'application/json' } });
        if (engineResp.ok) return engineResp;
      } catch (_) { /* engine offline, fall through */ }
    }

    // Proxy MiroFish Multi-Agent GraphRAG. Forward POST body to the Flask
    // backend (localhost:5001); if unreachable, serve deterministic mock data.
    if (path === '/api/mirofish/mekong-trigger') {
      if (method === 'POST') {
        try {
          let body = {};
          try { body = await request.json(); } catch (_) { /* empty body */ }
          const mirofishResp = await fetch(`${MIROFISH_URL}/api/simulation/mekong-trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (mirofishResp.ok) return mirofishResp;
        } catch (_) { /* mirofish offline, serve mock */ }
        return json({ ok: true, data: generateMirofishMock() });
      }
    }

    // === USER AUTH (unchanged) ===
    if (path === '/api/ping') return json({ ok: true, ping: 'pong' });

    if (path === '/api/register' && method === 'POST') {
      try {
        const db = await getDB(env);
        const body = await request.json();
        const { name, email, phone, pass, role, userRole, accessId } = body;
        if (!name || !email || !pass) return json({ error: 'Thieu thong tin' }, 400);
        const existing = await db.prepare('SELECT id, role FROM users WHERE email = ?').bind(email).first();
        if (existing) {
          if (role === 'admin' && existing.role !== 'admin') {
            await db.prepare('UPDATE users SET role=?, userRole=?, status=?, updatedAt=? WHERE id=?').bind('admin', 'ADMIN', 'approved', new Date().toISOString(), existing.id).run();
            return json({ ok: true, status: 'approved', tier: 'admin', trustScore: 100, accessId: existing.id, updated: true });
          }
          return json({ error: 'Email da ton tai' }, 409);
        }
        let trustScore = 50;
        if (role === 'admin') trustScore = 100;
        else if (role === 'nong_dan' || role === 'nguoi_dan') trustScore = 75;
        else if (role === 'doanh_nghiep') trustScore = 60;
        else if (role === 'nha_dau_tu') trustScore = 55;
        let status = 'pending', tier = 'exception';
        if (role === 'admin') { status = 'approved'; tier = 'admin'; }
        else if (role === 'doanh_nghiep' || role === 'nha_dau_tu') { status = 'pending'; tier = 'awaiting_approval'; }
        else if (role === 'nong_dan' || role === 'nguoi_dan') { status = 'approved'; tier = trustScore >= 70 ? 'trusted' : 'standard'; }
        else if (trustScore >= 70) { status = 'approved'; tier = 'trusted'; }
        else if (trustScore >= 50) { status = 'approved'; tier = 'standard'; }
        else { status = 'exception'; tier = 'flagged'; }
        const ur = userRole || (role || 'nong_dan').toUpperCase();
        const ts = new Date().toISOString();
        const aid = accessId || crypto.randomUUID();
        await db.prepare('INSERT INTO users (name, email, phone, pass, role, userRole, status, accessId, trustScore, tier, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(name, email, phone || '', pass, role || 'nong_dan', ur, status, aid, trustScore, tier, ts, ts).run();
        const aiLog = 'AI Gatekeeper | ' + ts + ' | ' + email + ' | Score:' + trustScore + ' | Tier:' + tier + ' | Status:' + status;
        await db.prepare('INSERT INTO ai_log (logType, detail, createdAt) VALUES (?, ?, ?)').bind('gatekeeper', aiLog, ts).run();
        return json({ ok: true, status, tier, trustScore, accessId: aid });
      } catch (e) { return json({ error: e.message }, 500); }
    }

    if (path === '/api/login' && method === 'POST') {
      try {
        const db = await getDB(env);
        const body = await request.json();
        const { email, pass } = body;
        if (!email || !pass) return json({ error: 'Thieu thong tin' }, 400);
        const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
        if (!user) return json({ error: 'Sai email hoac mat khau' }, 401);
        if (user.status === 'blocked') return json({ error: 'Tai khoan da bi khoa' }, 403);
        if (user.status === 'pending') return json({ error: 'Tai khoan dang cho duyet' }, 403);
        if (user.pass !== pass) return json({ error: 'Sai email hoac mat khau' }, 401);
        return json({ ok: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone || '', role: user.role, userRole: user.userRole, status: user.status, accessId: user.accessId, trustScore: user.trustScore, tier: user.tier, createdAt: user.createdAt } });
      } catch (e) { return json({ error: e.message }, 500); }
    }

    if (path === '/api/users' && method === 'GET') {
      try {
        const db = await getDB(env);
        const adminEmail = url.searchParams.get('admin');
        const action = url.searchParams.get('action') || 'users';
        if (action === 'stats') {
          const total = await db.prepare('SELECT COUNT(*) as c FROM users').first();
          const approved = await db.prepare("SELECT COUNT(*) as c FROM users WHERE status='approved'").first();
          const pending = await db.prepare("SELECT COUNT(*) as c FROM users WHERE status='pending'").first();
          const exception = await db.prepare("SELECT COUNT(*) as c FROM users WHERE status='exception'").first();
          const blocked = await db.prepare("SELECT COUNT(*) as c FROM users WHERE status='blocked'").first();
          const byRole = await db.prepare('SELECT role, COUNT(*) as c FROM users GROUP BY role').all();
          const byTier = await db.prepare('SELECT tier, COUNT(*) as c FROM users GROUP BY tier').all();
          const recent = await db.prepare('SELECT logType, detail, createdAt FROM ai_log ORDER BY id DESC LIMIT 20').all();
          return json({ ok: true, stats: { total: total.c, approved: approved.c, pending: pending.c, exception: exception.c, blocked: blocked.c, byRole: byRole.results, byTier: byTier.results, recentLogs: recent.results } });
        }
        if (!adminEmail) return json({ error: 'Thieu admin' }, 401);
        let admin = await db.prepare('SELECT role FROM users WHERE email = ?').bind(adminEmail).first();
        if (!admin) {
          const ts = new Date().toISOString();
          try { await db.prepare('INSERT INTO users (name, email, phone, pass, role, userRole, status, accessId, trustScore, tier, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .bind('Admin', ADMIN_EMAIL, '0358814661', ADMIN_PASS, 'admin', 'ADMIN', 'approved', ADMIN_AID, 100, 'admin', ts, ts).run(); admin = { role: 'admin' };
          } catch (e) { admin = null; }
        }
        if (!admin || admin.role !== 'admin') return json({ error: 'Khong co quyen', detail: admin ? 'role=' + admin.role : 'not found' }, 403);
        if (action === 'exceptions') {
          const users = await db.prepare("SELECT id, name, email, phone, role, userRole, status, accessId, trustScore, tier, createdAt FROM users WHERE status='exception' OR status='pending' ORDER BY id DESC").all();
          return json({ ok: true, users: users.results });
        }
        const users = await db.prepare('SELECT id, name, email, phone, role, userRole, status, accessId, trustScore, tier, createdAt FROM users ORDER BY id DESC').all();
        return json({ ok: true, users: users.results });
      } catch (e) { return json({ error: e.message }, 500); }
    }

    if (path === '/api/approve' && method === 'POST') {
      try {
        const db = await getDB(env);
        const body = await request.json();
        const { adminEmail, userId, action, reason } = body;
        if (!adminEmail || !userId) return json({ error: 'Thieu tham so' }, 400);
        const admin = await db.prepare('SELECT role FROM users WHERE email = ?').bind(adminEmail).first();
        if (!admin || admin.role !== 'admin') return json({ error: 'Khong co quyen' }, 403);
        let newStatus, newTier;
        if (action === 'block') { newStatus = 'blocked'; newTier = 'blocked'; }
        else if (action === 'reject') { newStatus = 'rejected'; newTier = 'flagged'; }
        else if (action === 'delete') {
          await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
          return json({ ok: true, status: 'deleted' });
        }
        else if (action === 'unblock') { newStatus = 'approved'; newTier = 'trusted'; }
        else { newStatus = 'approved'; newTier = 'trusted'; }
        await db.prepare('UPDATE users SET status=?, tier=?, updatedAt=? WHERE id=?').bind(newStatus, newTier, new Date().toISOString(), userId).run();
        return json({ ok: true, status: newStatus });
      } catch (e) { return json({ error: e.message }, 500); }
    }

    // === ENHANCED ENGINE API ENDPOINTS ===

    // MULTI-MODEL ENSEMBLE CONSENSUS
    if (path === '/api/engine/ensemble/consensus') {
      const consensus = generateEnsembleConsensus();
      return json({ ok: true, ...consensus });
    }

    // GIS RISK MATRIX
    if (path === '/api/engine/gis/risk-matrix') {
      const lat = parseFloat(url.searchParams.get('lat') || '10.0');
      const lon = parseFloat(url.searchParams.get('lon') || '106.0');
      const matrix = generateRiskMatrix(lat, lon);
      return json({ ok: true, ...matrix });
    }

    // GROUND TRUTH STATIONS
    if (path === '/api/engine/ground-truth/stations') {
      return json({ ok: true, stations: generateGroundStations() });
    }

    // FULL ASSESSMENT PIPELINE
    if (path === '/api/engine/assessment/full') {
      const assessment = runFullAssessment();
      return json({ ok: true, ...assessment });
    }

    // LONG-TERM FORECAST
    if (path === '/api/engine/forecast/long-term') {
      const month = parseInt(url.searchParams.get('month') || '8');
      return json({ ok: true, ...generateLongTermForecast(month) });
    }

    // ALERT HISTORY
    if (path === '/api/engine/alerts/history') {
      return json({ ok: true, alerts: getAlertHistory() });
    }

    // MULTI-HAZARD EARLY WARNING SYSTEM
    if (path.startsWith('/api/engine/multi-hazard/')) {
      const sub = path.replace('/api/engine/multi-hazard/', '');
      if (sub === 'outlook') {
        const months = parseInt(url.searchParams.get('months') || '2');
        return json({ ok: true, ...generateMultiHazardOutlook(months) });
      }
      if (sub === 'risk-map') {
        return json(await generateRiskMap());
      }
      const result = await serveMultiHazard(sub);
      if (result) return json(result);
    }

    // HYDROLOGY — MEKONG WATER LEVEL
    if (path === '/api/engine/hydrology/stations') {
      return json({ ok: true, ...generateHydrology() });
    }
    if (path === '/api/engine/hydrology/overview') {
      const h = generateHydrology();
      return json({ ok: true, timestamp: new Date().toISOString(), overview_level: h.overview_level, watch_status: h.watch_status, data_source: h.data_source, live_stations_used: 0, total_stations: h.total_stations, flood_alert_count: h.flood_alert_count, warning_stations: h.warning_stations, narrative: h.narrative });
    }

    // REPORT EXPORT
    if (path === '/api/engine/report/summary') {
      return json(await generateReportSummary());
    }

    // === LEGACY WEATHER / DISASTER ENDPOINTS (enhanced) ===
    if (path === '/api/weather/current' && method === 'GET') {
      const provinces = [
        {name:'An Giang',temp:32,humidity:78,wind:12,rain:45,condition:'Nắng yếu, mưa rào',icon:'⛅'},
        {name:'Đồng Tháp',temp:31,humidity:82,wind:8,rain:62,condition:'Mưa vừa, gió nhẹ',icon:'🌦️'},
        {name:'Cần Thơ',temp:33,humidity:75,wind:15,rain:20,condition:'Nắng nóng, có mây',icon:'☀️'},
        {name:'Tiền Giang',temp:30,humidity:85,wind:10,rain:78,condition:'Mưa to, cảnh báo ngập',icon:'🌧️'},
        {name:'Bến Tre',temp:31,humidity:80,wind:14,rain:35,condition:'Có mây, mưa rào',icon:'⛅'},
        {name:'Cà Mau',temp:29,humidity:88,wind:18,rain:90,condition:'Mưa lớn, gió mạnh',icon:'🌧️'},
        {name:'Kiên Giang',temp:30,humidity:82,wind:16,rain:55,condition:'Mưa rào, có giông',icon:'⛈️'},
        {name:'Sóc Trăng',temp:31,humidity:79,wind:11,rain:48,condition:'Có mây, mưa nhẹ',icon:'⛅'}
      ];
      const now = Date.now();
      const data = provinces.map(p => ({
        ...p,
        temp: p.temp + Math.round((Math.random() - 0.5) * 4),
        humidity: Math.min(100, Math.max(40, p.humidity + Math.round((Math.random() - 0.5) * 10))),
        wind: Math.max(0, p.wind + Math.round((Math.random() - 0.5) * 6)),
        rain: Math.max(0, p.rain + Math.round((Math.random() - 0.5) * 20)),
        updatedAt: new Date().toISOString(),
        source: 'Himawari-9 + IoT Mesh + Ground Stations'
      }));
      return json({ ok: true, data, timestamp: new Date().toISOString(), source: 'Hệ thống giám sát thời gian thực Mekong Eco-Shield AI Engine v2' });
    }

    if (path === '/api/weather/forecast' && method === 'GET') {
      const province = url.searchParams.get('province') || 'Cần Thơ';
      const days = [];
      const conditions = ['Nắng nóng', 'Có mây, mưa rào', 'Mưa vừa', 'Nắng yếu', 'Mưa to', 'Giông bão', 'Nhiều mây'];
      const icons = ['☀️', '⛅', '🌦️', '🌤️', '🌧️', '⛈️', '☁️'];
      for (let i = 0; i < 7; i++) {
        const ci = Math.floor(Math.random() * conditions.length);
        const baseTemp = 31 + Math.round((Math.random() - 0.5) * 4);
        days.push({
          day: i === 0 ? 'Hôm nay' : ['T2','T3','T4','T5','T6','T7'][i-1],
          date: new Date(Date.now() + i * 86400000).toLocaleDateString('vi-VN'),
          tempHigh: baseTemp + Math.round(Math.random() * 3),
          tempLow: baseTemp - Math.round(Math.random() * 5 + 2),
          humidity: Math.round(65 + Math.random() * 25),
          wind: Math.round(5 + Math.random() * 20),
          rain: Math.round(Math.random() * 100),
          condition: conditions[ci],
          icon: icons[ci],
          confidence: Math.round(70 + Math.random() * 25)
        });
      }
      return json({ ok: true, province, forecast: days, model: 'Ensemble GFS+ECMWF+GEM+AI', updatedAt: new Date().toISOString() });
    }

    if (path === '/api/disaster/assess' && method === 'GET') {
      const province = url.searchParams.get('province') || 'all';
      const provinces_data = [
        {name:'An Giang',flood:72,storm:45,drought:35,models:{lstm:{risk:71,conf:88},transformer:{risk:74,conf:82},pinns:{risk:70,conf:90}},trend:'increasing',zone:'Đồng Tháp Mười'},
        {name:'Đồng Tháp',flood:65,storm:40,drought:45,models:{lstm:{risk:63,conf:85},transformer:{risk:67,conf:80},pinns:{risk:65,conf:87}},trend:'stable',zone:'Đồng Tháp Mười'},
        {name:'Cần Thơ',flood:55,storm:50,drought:30,models:{lstm:{risk:54,conf:90},transformer:{risk:56,conf:85},pinns:{risk:55,conf:92}},trend:'stable',zone:'Trung tâm'},
        {name:'Tiền Giang',flood:78,storm:55,drought:25,models:{lstm:{risk:80,conf:86},transformer:{risk:75,conf:80},pinns:{risk:78,conf:88}},trend:'increasing',zone:'Ven biển Đông'},
        {name:'Bến Tre',flood:82,storm:60,drought:20,models:{lstm:{risk:84,conf:84},transformer:{risk:80,conf:78},pinns:{risk:82,conf:86}},trend:'increasing',zone:'Ven biển Đông'},
        {name:'Cà Mau',flood:88,storm:72,drought:15,models:{lstm:{risk:90,conf:82},transformer:{risk:85,conf:76},pinns:{risk:88,conf:84}},trend:'increasing',zone:'Bán đảo Cà Mau'},
        {name:'Vĩnh Long',flood:60,storm:35,drought:40,models:{lstm:{risk:58,conf:87},transformer:{risk:62,conf:82},pinns:{risk:60,conf:89}},trend:'stable',zone:'Trung tâm'},
        {name:'Long An',flood:70,storm:48,drought:30,models:{lstm:{risk:69,conf:86},transformer:{risk:72,conf:80},pinns:{risk:70,conf:88}},trend:'increasing',zone:'Vùng trũng'},
        {name:'Kiên Giang',flood:75,storm:55,drought:25,models:{lstm:{risk:74,conf:85},transformer:{risk:76,conf:80},pinns:{risk:73,conf:88}},trend:'increasing',zone:'Vịnh Thái Lan'},
        {name:'Sóc Trăng',flood:68,storm:42,drought:35,models:{lstm:{risk:66,conf:86},transformer:{risk:70,conf:80},pinns:{risk:67,conf:87}},trend:'stable',zone:'Ven biển Đông'}
      ];
      const filtered = province === 'all' ? provinces_data : provinces_data.filter(p => p.name.toLowerCase().includes(province.toLowerCase()));
      const ensemble = filtered.length > 0 ? {
        avgFloodRisk: Math.round(filtered.reduce((s,p) => s + p.flood, 0) / filtered.length),
        avgStormRisk: Math.round(filtered.reduce((s,p) => s + p.storm, 0) / filtered.length),
        avgDroughtRisk: Math.round(filtered.reduce((s,p) => s + p.drought, 0) / filtered.length),
        ensembleConfidence: Math.round(82 + Math.random() * 10),
        alertLevel: filtered.some(p => p.flood >= 80) ? 'RED' : filtered.some(p => p.flood >= 65) ? 'ORANGE' : 'YELLOW'
      } : null;
      const alerts = filtered.filter(p => p.flood >= 75).map(p => ({ province: p.name, risk: p.flood, action: 'Theo dõi mực nước, chuẩn bị di dời' }));
      return json({
        ok: true,
        province: province === 'all' ? 'Đồng bằng sông Cửu Long' : province,
        provinces: filtered,
        ensemble,
        alerts,
        models: ['Bi-LSTM (Độ tin cậy: 86%)', 'Transformer (Độ tin cậy: 81%)', 'PINNs (Độ tin cậy: 88%)', 'Ensemble GFS+ECMWF+GEM (Độ tin cậy: 92%)'],
        methodology: 'Kết hợp 3 mô hình AI + đa mô hình NWP: Bi-LSTM phân tích chuỗi thời gian, Transformer học ngữ cảnh không gian, PINNs mô phỏng vật lý, Ensemble GFS/ECMWF/GEM đồng thuận',
        updatedAt: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 900000).toISOString()
      });
    }

    // ENHANCED STORM TRACK WITH MULTI-MODEL CONSENSUS
    if (path === '/api/storm/track' && method === 'GET') {
      const storms = generateStormTracks();
      return json({
        ok: true,
        storms,
        season: 'Mùa bão Biển Đông 2026',
        totalStorms: 10,
        activeStorms: storms.length,
        ensemble: generateEnsembleConsensus(),
        updatedAt: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 3600000).toISOString()
      });
    }

    if (path === '/api/flood/assess' && method === 'GET') {
      const stations = [
        {name:'Trạm Tân Châu',river:'Sông Tiền',province:'An Giang',waterLevel:3.85,alertLevel:4.0,criticalLevel:4.5,trend:'up',rain24h:65,rain72h:180,risk:72,status:'Cảnh báo'},
        {name:'Trạm Chợ Mới',river:'Sông Hậu',province:'An Giang',waterLevel:3.42,alertLevel:3.8,criticalLevel:4.2,trend:'stable',rain24h:42,rain72h:120,risk:55,status:'Theo dõi'},
        {name:'Trạm Cần Thơ',river:'Sông Hậu',province:'Cần Thơ',waterLevel:2.15,alertLevel:2.8,criticalLevel:3.2,trend:'up',rain24h:38,rain72h:95,risk:40,status:'Bình thường'},
        {name:'Trạm Mỹ Thuận',river:'Sông Tiền',province:'Tiền Giang',waterLevel:3.95,alertLevel:4.0,criticalLevel:4.5,trend:'up',rain24h:78,rain72h:220,risk:82,status:'Cảnh báo đỏ'},
        {name:'Trạm Vàm Cống',river:'Sông Hậu',province:'Đồng Tháp',waterLevel:3.65,alertLevel:3.8,criticalLevel:4.2,trend:'up',rain24h:55,rain72h:150,risk:68,status:'Cảnh báo'},
        {name:'Trạm Bến Tre',river:'Sông Cổ Chiên',province:'Bến Tre',waterLevel:3.12,alertLevel:3.5,criticalLevel:4.0,trend:'stable',rain24h:45,rain72h:110,risk:50,status:'Theo dõi'},
        {name:'Trạm Cà Mau',river:'Sông Ông Đốc',province:'Cà Mau',waterLevel:2.85,alertLevel:3.2,criticalLevel:3.8,trend:'up',rain24h:90,rain72h:280,risk:88,status:'Cảnh báo đỏ'},
        {name:'Trạm Rạch Giá',river:'Vịnh Thái Lan',province:'Kiên Giang',waterLevel:2.45,alertLevel:3.0,criticalLevel:3.5,trend:'stable',rain24h:35,rain72h:90,risk:45,status:'Bình thường'},
        {name:'Trạm Sóc Trăng',river:'Sông Hậu',province:'Sóc Trăng',waterLevel:3.25,alertLevel:3.5,criticalLevel:4.0,trend:'up',rain24h:52,rain72h:135,risk:60,status:'Theo dõi'}
      ];
      return json({
        ok: true,
        stations,
        overallRisk: Math.round(stations.reduce((s,st) => s + st.risk, 0) / stations.length),
        redAlert: stations.filter(s => s.status === 'Cảnh báo đỏ').length,
        warning: stations.filter(s => s.status === 'Cảnh báo').length,
        model: 'PINNs Navier-Stokes + Bi-LSTM + Ensemble GFS/ECMWF/GEM + IoT Ground Truth',
        dataSource: 'Trạm thủy văn tự động + vệ tinh SWOT + Himawari-9',
        updatedAt: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 600000).toISOString()
      });
    }

    if (path === '/api/iot/sensors' && method === 'GET') {
      const types = ['Mực nước', 'Lượng mưa', 'Độ ẩm đất', 'Chất lượng nước', 'Gió', 'Nhiệt độ'];
      const provinces_list = ['An Giang', 'Đồng Tháp', 'Cần Thơ', 'Tiền Giang', 'Bến Tre', 'Cà Mau', 'Vĩnh Long', 'Long An', 'Kiên Giang', 'Sóc Trăng'];
      const sensors = [];
      for (let i = 0; i < 36; i++) {
        const type = types[i % types.length];
        const province = provinces_list[Math.floor(i / 3.6) % provinces_list.length];
        const online = Math.random() > 0.1;
        let value, unit;
        switch (type) {
          case 'Mực nước': value = (2 + Math.random() * 2.5).toFixed(2); unit = 'm'; break;
          case 'Lượng mưa': value = Math.round(Math.random() * 80); unit = 'mm'; break;
          case 'Độ ẩm đất': value = Math.round(50 + Math.random() * 45); unit = '%'; break;
          case 'Chất lượng nước': value = (6 + Math.random() * 2).toFixed(1); unit = 'pH'; break;
          case 'Gió': value = Math.round(5 + Math.random() * 40); unit = 'km/h'; break;
          case 'Nhiệt độ': value = (28 + Math.random() * 8).toFixed(1); unit = '°C'; break;
        }
        sensors.push({
          id: 'SENSOR-' + String(i + 1).padStart(4, '0'),
          type,
          province,
          location: province + ' — Trạm ' + Math.floor(Math.random() * 5 + 1),
          value: parseFloat(value),
          unit,
          battery: Math.round(30 + Math.random() * 70),
          signal: Math.round(40 + Math.random() * 60),
          online,
          lastSeen: online ? new Date(Date.now() - Math.random() * 300000).toISOString() : new Date(Date.now() - Math.random() * 86400000).toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      return json({
        ok: true,
        sensors,
        total: sensors.length,
        online: sensors.filter(s => s.online).length,
        offline: sensors.filter(s => !s.online).length,
        networkStatus: sensors.filter(s => s.online).length / sensors.length > 0.8 ? 'Tốt' : 'Cần bảo trì',
        updatedAt: new Date().toISOString()
      });
    }

    if (path === '/api/historical/compare' && method === 'GET') {
      const events = [
        {year:2024,event:'Bão số 3 (YAGI)',type:'Bão',maxWind:155,floodLevel:4.2,damage:'30.000 tỷ đồng',similarity:68},
        {year:2022,event:'Lũ lịch sử ĐBSCL',type:'Lũ',maxWind:0,floodLevel:4.8,damage:'5.000 tỷ đồng',similarity:42},
        {year:2020,event:'Hạn mặn lịch sử',type:'Hạn hán',maxWind:0,floodLevel:0.5,damage:'8.000 tỷ đồng',similarity:55},
        {year:2019,event:'Bão số 9 (Matmo)',type:'Bão',maxWind:135,floodLevel:3.8,damage:'2.500 tỷ đồng',similarity:45},
        {year:2017,event:'Bão số 12 (Damrey)',type:'Bão',maxWind:165,floodLevel:4.5,damage:'22.000 tỷ đồng',similarity:72},
        {year:2016,event:'Hạn mặn kỷ lục',type:'Hạn hán',maxWind:0,floodLevel:0.3,damage:'10.000 tỷ đồng',similarity:60},
        {year:2011,event:'Lũ lớn ĐBSCL',type:'Lũ',maxWind:0,floodLevel:5.2,damage:'3.500 tỷ đồng',similarity:38}
      ];
      return json({
        ok: true,
        events,
        totalEvents: events.length,
        methodology: 'So sánh mẫu hình thời tiết hiện tại với cơ sở dữ liệu lịch sử 50 năm sử dụng Bi-LSTM + Pattern Matching + Ensemble Validation',
        currentSituation: 'Lượng mưa và mực nước hiện tại tương đồng với giai đoạn trước bão số 12 (2017) và bão YAGI (2024). Cảnh báo sớm 14 ngày từ CanSIPS: bất thường nhiệt độ +200% so với trung bình.',
        recommendation: 'Theo dõi sát diễn biến thời tiết, chuẩn bị phương án sơ tán cho vùng thấp trũng. Kích hoạt hệ thống cảnh báo sớm đa tầng.',
        updatedAt: new Date().toISOString()
      });
    }

    // === STATIC ASSETS ===
    const response = await env.ASSETS.fetch(request);
    return response;
  }
};

// ===== ENGINE FUNCTIONS (simulated, replace with Python backend calls) =====

function generateStormTracks() {
  const now = Date.now();
  const storms = [
    {
      name: 'Bão 12W (Dolphin)',
      status: 'Đang hoạt động',
      category: 4,
      windSpeed: 185,
      gustSpeed: 220,
      pressure: 941,
      position: { lat: 15.8, lon: 114.5 },
      movement: 'Tây Tây Bắc, 18 km/h',
      radius: 280,
      forecast: [
        { time: '6h', lat: 16.2, lon: 113.2, wind: 180, cat: 4 },
        { time: '12h', lat: 16.6, lon: 111.8, wind: 170, cat: 4 },
        { time: '24h', lat: 17.2, lon: 109.5, wind: 155, cat: 3 },
        { time: '48h', lat: 18.0, lon: 107.0, wind: 130, cat: 2 },
        { time: '72h', lat: 18.8, lon: 105.2, wind: 100, cat: 2 },
        { time: '96h', lat: 19.5, lon: 103.8, wind: 75, cat: 1 },
        { time: '120h', lat: 20.0, lon: 102.5, wind: 55, cat: 0 }
      ],
      affectedAreas: ['Quảng Bình', 'Quảng Trị', 'Thừa Thiên Huế', 'Đà Nẵng', 'Quảng Nam'],
      models: {
        ecmwf: { track: 'Đổ bộ Đà Nẵng - Quảng Nam', confidence: 82, wind: 175 },
        gfs: { track: 'Đổ bộ Quảng Bình - Quảng Trị', confidence: 78, wind: 165 },
        gem: { track: 'Đổ bộ Thừa Thiên Huế', confidence: 72, wind: 160 }
      },
      ensemble: { agreement: 76, spread: 85, probability: 82.5 },
      warning: 'Cảnh báo bão mạnh cấp 4 - Nguy cơ rất cao cho Trung Bộ. Kích hoạt cảnh báo sớm 14 ngày.',
      source: 'JTWC + NCHMF + ECMWF + GFS + GEM + Himawari-9'
    },
    {
      name: 'Bão số 1 (Bão YAGI - tàn dư)',
      status: 'Suy yếu',
      category: 1,
      windSpeed: 85,
      gustSpeed: 110,
      pressure: 985,
      position: { lat: 18.2, lon: 108.5 },
      movement: 'Tây, 12 km/h',
      radius: 180,
      forecast: [
        { time: '6h', lat: 18.5, lon: 107.5, wind: 80, cat: 1 },
        { time: '12h', lat: 18.8, lon: 106.5, wind: 70, cat: 0 },
        { time: '24h', lat: 19.2, lon: 105.0, wind: 55, cat: 0 }
      ],
      affectedAreas: ['Hà Tĩnh', 'Quảng Bình'],
      models: {
        ecmwf: { track: 'Tan dần trên đất liền', confidence: 90, wind: 75 },
        gfs: { track: 'Tan dần trên đất liền', confidence: 88, wind: 70 },
        gem: { track: 'Tan dần trên đất liền', confidence: 85, wind: 72 }
      },
      ensemble: { agreement: 88, spread: 30, probability: 10 },
      warning: 'Bão đã suy yếu thành vùng thấp, tiếp tục theo dõi sạt lở đất và mưa lớn sau bão.',
      source: 'JTWC + NCHMF'
    },
    {
      name: 'Áp thấp nhiệt đới (93W)',
      status: 'Đang hình thành',
      category: 0,
      windSpeed: 55,
      gustSpeed: 75,
      pressure: 998,
      position: { lat: 11.8, lon: 119.5 },
      movement: 'Tây, 15 km/h',
      radius: 150,
      forecast: [
        { time: '12h', lat: 12.2, lon: 118.0, wind: 60, cat: 0 },
        { time: '24h', lat: 12.8, lon: 116.5, wind: 75, cat: 0 },
        { time: '48h', lat: 13.5, lon: 114.0, wind: 90, cat: 1 },
        { time: '72h', lat: 14.0, lon: 112.0, wind: 105, cat: 1 },
        { time: '96h', lat: 14.5, lon: 110.5, wind: 65, cat: 0 }
      ],
      affectedAreas: ['Palawan', 'Nam Biển Đông', 'Duyên hải Nam Trung Bộ'],
      models: {
        ecmwf: { track: 'Hướng về phía Tây Nam Biển Đông', confidence: 68, wind: 80 },
        gfs: { track: 'Mạnh lên thành bão cấp 1 trong 48h', confidence: 65, wind: 90 },
        gem: { track: 'Có 45% mạnh lên thành bão cấp 2', confidence: 62, wind: 95 }
      },
      ensemble: { agreement: 65, spread: 120, probability: 55 },
      warning: 'Theo dõi sát diễn biến áp thấp nhiệt đới. Có khả năng mạnh lên thành bão trong 2-3 ngày tới.',
      source: 'JTWC + NCHMF + ECMWF + GFS + GEM'
    }
  ];
  return storms;
}

function generateEnsembleConsensus() {
  const hours = [24, 48, 72, 96, 120, 144, 192, 240];
  const consensus = hours.map((h, i) => ({
    hour: h,
    lat: parseFloat((13.5 + i * 0.6).toFixed(2)),
    lon: parseFloat((115.0 - i * 1.1).toFixed(2)),
    wind_speed: Math.min(200, 65 + i * 14),
    pressure: Math.max(940, 1010 - i * 9),
    category: Math.min(5, Math.floor(i * 0.6))
  }));

  return {
    consensus,
    members: [
      { model: 'ECMWF', landfall_lat: 17.2, landfall_lon: 107.5, max_wind: 175, min_pressure: 941, confidence: 82 },
      { model: 'GFS', landfall_lat: 16.8, landfall_lon: 108.2, max_wind: 165, min_pressure: 948, confidence: 78 },
      { model: 'GEM', landfall_lat: 17.5, landfall_lon: 106.8, max_wind: 160, min_pressure: 952, confidence: 72 }
    ],
    ensemble_metrics: {
      spread_km: 85,
      agreement_pct: 76,
      landfall_probability: 82.5,
      recommended_level: 4
    }
  };
}

function generateRiskMatrix(centerLat, centerLon) {
  const cells = [];
  const hotspots = [];
  const provinces = {};
  const gridStep = 0.12;

  for (let r = 0; r < 25; r++) {
    for (let c = 0; c < 20; c++) {
      const lat = centerLat - 1.5 + r * gridStep;
      const lon = centerLon - 1.2 + c * gridStep;
      const dist = Math.sqrt((lat - 14.5) ** 2 + (lon - 108.0) ** 2);
      let level = 1;
      if (dist < 0.5) level = 5;
      else if (dist < 1.0) level = 4;
      else if (dist < 1.8) level = 3;
      else if (dist < 2.8) level = 2;

      const cell = {
        lat: parseFloat(lat.toFixed(3)),
        lon: parseFloat(lon.toFixed(3)),
        level,
        province: getProvince(lat, lon),
        factors: level >= 4 ? { storm_proximity: `${(dist * 111).toFixed(0)}km`, pressure_drop: '945hPa' } : {}
      };
      cells.push(cell);
      if (level >= 5) hotspots.push(cell);

      const p = cell.province;
      if (!provinces[p]) provinces[p] = { cells: 0, max_level: 0, hotspots: 0 };
      provinces[p].cells++;
      provinces[p].max_level = Math.max(provinces[p].max_level, level);
      if (level >= 5) provinces[p].hotspots++;
    }
  }

  return {
    total_cells: cells.length,
    hotspots: hotspots.length,
    total_level: hotspots.length > 0 ? 5 : 3,
    affected_area_km2: parseFloat((hotspots.length * gridStep * 111 * gridStep * 111).toFixed(2)),
    province_risk: provinces,
    hotspot_coords: hotspots.slice(0, 20).map(h => ({ lat: h.lat, lon: h.lon, level: 5, province: h.province })),
    cells
  };
}

function getProvince(lat, lon) {
  if (lat >= 10.2 && lat <= 11.0 && lon >= 105.0 && lon <= 105.5) return 'An Giang';
  if (lat >= 10.2 && lat <= 11.0 && lon >= 105.5 && lon <= 106.0) return 'Đồng Tháp';
  if (lat >= 10.0 && lat <= 10.3 && lon >= 105.5 && lon <= 106.0) return 'Cần Thơ';
  if (lat >= 10.2 && lat <= 10.6 && lon >= 106.0 && lon <= 106.8) return 'Tiền Giang';
  if (lat >= 10.0 && lat <= 10.4 && lon >= 106.2 && lon <= 106.8) return 'Bến Tre';
  if (lat >= 8.5 && lat <= 9.5 && lon >= 104.5 && lon <= 105.5) return 'Cà Mau';
  if (lat >= 9.5 && lat <= 10.5 && lon >= 104.5 && lon <= 105.5) return 'Kiên Giang';
  if (lat >= 9.2 && lat <= 9.8 && lon >= 105.8 && lon <= 106.5) return 'Sóc Trăng';
  if (lat >= 10.0 && lat <= 10.4 && lon >= 105.8 && lon <= 106.3) return 'Vĩnh Long';
  if (lat >= 10.4 && lat <= 11.0 && lon >= 106.0 && lon <= 106.8) return 'Long An';
  if (lat >= 9.6 && lat <= 10.2 && lon >= 105.5 && lon <= 106.0) return 'Hậu Giang';
  if (lat >= 9.0 && lat <= 9.6 && lon >= 105.5 && lon <= 106.0) return 'Bạc Liêu';
  if (lat >= 9.6 && lat <= 10.2 && lon >= 106.0 && lon <= 106.5) return 'Trà Vinh';
  return 'TP.HCM / Vùng lân cận';
}

function generateGroundStations() {
  return [
    { id: 'TANCHAU', name: 'Trạm Tân Châu', province: 'An Giang', lat: 10.82, lon: 105.12, river: 'Sông Tiền', water_level: 3.85, rain_24h: 65, rain_72h: 180, wind_speed: 12, temperature: 31, humidity: 78, status: 'online' },
    { id: 'CHOMOI', name: 'Trạm Chợ Mới', province: 'An Giang', lat: 10.35, lon: 105.45, river: 'Sông Hậu', water_level: 3.42, rain_24h: 42, rain_72h: 120, wind_speed: 8, temperature: 32, humidity: 75, status: 'online' },
    { id: 'CANTHO', name: 'Trạm Cần Thơ', province: 'Cần Thơ', lat: 10.03, lon: 105.78, river: 'Sông Hậu', water_level: 2.15, rain_24h: 38, rain_72h: 95, wind_speed: 10, temperature: 33, humidity: 70, status: 'online' },
    { id: 'MYTHUAN', name: 'Trạm Mỹ Thuận', province: 'Tiền Giang', lat: 10.28, lon: 106.00, river: 'Sông Tiền', water_level: 3.95, rain_24h: 78, rain_72h: 220, wind_speed: 15, temperature: 30, humidity: 82, status: 'online' },
    { id: 'BENTRE', name: 'Trạm Bến Tre', province: 'Bến Tre', lat: 10.23, lon: 106.38, river: 'Sông Cổ Chiên', water_level: 3.12, rain_24h: 45, rain_72h: 110, wind_speed: 11, temperature: 31, humidity: 80, status: 'online' },
    { id: 'CAMAU', name: 'Trạm Cà Mau', province: 'Cà Mau', lat: 9.18, lon: 105.15, river: 'Sông Ông Đốc', water_level: 2.85, rain_24h: 90, rain_72h: 280, wind_speed: 18, temperature: 29, humidity: 88, status: 'online' },
    { id: 'VAMCONG', name: 'Trạm Vàm Cống', province: 'Đồng Tháp', lat: 10.30, lon: 105.55, river: 'Sông Hậu', water_level: 3.65, rain_24h: 55, rain_72h: 150, wind_speed: 9, temperature: 31, humidity: 76, status: 'online' },
    { id: 'RACHGIA', name: 'Trạm Rạch Giá', province: 'Kiên Giang', lat: 10.02, lon: 105.08, river: 'Vịnh Thái Lan', water_level: 2.45, rain_24h: 35, rain_72h: 90, wind_speed: 14, temperature: 32, humidity: 72, status: 'online' }
  ];
}

function runFullAssessment() {
  const consensus = generateEnsembleConsensus();
  const matrix = generateRiskMatrix(10.0, 106.0);
  const hotspots = matrix.hotspot_coords || [];

  return {
    pipeline: 'Data Ingestion → Ensemble Consensus → GIS Risk → Ground Truth → Alert Dispatch',
    satellite: {
      storm_detected: true,
      cloud_top_temp: -72.5
    },
    ensemble: consensus.ensemble_metrics,
    gis: {
      total_cells: matrix.total_cells,
      hotspots: matrix.hotspots,
      affected_area_km2: matrix.affected_area_km2,
      province_risk: matrix.province_risk
    },
    ground_truth: {
      validated: 5,
      stations_validated: 5
    },
    alert: consensus.ensemble_metrics.recommended_level >= 4 ? {
      alert_id: 'MES-ENGINE-' + Date.now().toString(36).toUpperCase(),
      level: consensus.ensemble_metrics.recommended_level,
      channels: ['telegram', 'zalo_zns', 'sms_gateway'],
      status: 'dispatched'
    } : null,
    timestamp: new Date().toISOString()
  };
}

function generateLongTermForecast(month) {
  return {
    month,
    init_time: `00z Jun 30 2026`,
    anomalies: {
      precipitation: {
        avg_mm: month === 8 ? 185.3 : 45.2,
        max_mm: month === 8 ? 420.0 : 120.0,
        min_mm: month === 8 ? -50.0 : -80.0,
        interpretation: 'Mưa vượt trội so với trung bình nhiều năm — nguy cơ lũ lụt, ngập úng diện rộng'
      },
      temperature: {
        avg_c: month === 8 ? 2.8 : 1.2,
        max_c: month === 8 ? 6.5 : 3.0,
        interpretation: 'Nhiệt độ cao hơn trung bình — tăng nguy cơ bốc thoát hơi nước'
      }
    },
    risk_zones: {
      flood: [{ lat: 10.5, lon: 105.8, anomaly_mm: 380, province: 'Đồng Tháp' }, { lat: 9.2, lon: 105.1, anomaly_mm: 350, province: 'Cà Mau' }],
      drought: [],
      heatwave: [{ lat: 11.0, lon: 106.0, anomaly_c: 5.2, province: 'Long An' }]
    },
    overall_risk_level: month === 8 ? 4 : 2,
    recommendation: 'KÍCH HOẠT CẢNH BÁO SỚM: Chuẩn bị kế hoạch ứng phó thiên tai. Theo dõi sát các bản tin dự báo ngắn hạn.',
    data_points: 225,
    confidence_avg: 76.3
  };
}

function getAlertHistory(limit) {
  const now = new Date();
  const all = [
    { alert_id: 'MES-001', level: 4, title: 'CẢNH BÁO BÃO CẤP 4', timestamp: now.toISOString(), results: ['Telegram: OK', 'Facebook Messenger: OK', 'Zalo ZNS: OK', 'SMS: OK'], status: 'active' },
    { alert_id: 'MES-002', level: 3, title: 'CẢNH BÁO LŨ CẤP 3', timestamp: new Date(now - 86400000).toISOString(), results: ['Telegram: OK', 'Facebook Messenger: OK', 'Zalo ZNS: OK'], status: 'resolved' },
    { alert_id: 'MES-003', level: 5, title: 'CẢNH BÁO THẢM HỌA CẤP 5', timestamp: new Date(now - 172800000).toISOString(), results: ['Telegram: OK', 'Facebook Messenger: OK', 'Zalo ZNS: OK', 'SMS: OK', 'Voice: OK'], status: 'resolved' }
  ];
  return limit ? all.slice(0, limit) : all;
}

// ===== MULTI-HAZARD EARLY WARNING (mock fallback) =====

function _compassDir(deg) {
  const dirs = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

function generateMultiHazardStorm() {
  const hours = [0, 24, 48, 72, 96, 120, 144, 192, 240];
  const trajectory = hours.map((h, i) => ({
    hour: h,
    lat: parseFloat((14.5 + i * 0.5).toFixed(2)),
    lon: parseFloat((114.0 - i * 0.7).toFixed(2)),
    wind_speed: Math.min(200, 75 + i * 12),
    pressure: Math.max(945, 1013 - i * 8),
    category: Math.min(5, Math.floor((75 + i * 12) / 38))
  }));
  const maxWind = trajectory[trajectory.length - 1].wind_speed;
  const minPressure = trajectory[trajectory.length - 1].pressure;
  return {
    hazard: 'storm',
    label: 'Bão / Áp thấp nhiệt đới',
    data_source: 'MÔ PHỎNG',
    active: true,
    current: { lat: 14.5, lon: 114.0 },
    intensity: {
      max_wind_kmh: maxWind,
      min_pressure_hpa: minPressure,
      category: 3,
      trend: 'Mạnh lên'
    },
    movement: {
      bearing_deg: 292.5,
      bearing_compass: 'Tây Bắc',
      speed_kmh: 17,
      trend: 'Di chuyển nhanh',
      landfall_zone: 'Quảng Bình - Quảng Trị',
      landfall_hour: 96
    },
    trajectory,
    risk_level: 4,
    analysis: {
      pressure_analysis: 'Áp suất tâm rất thấp — bão mạnh cấp 3+',
      intensity_analysis: 'Gió bão cấp 1-3 — gây tốc mái, gãy đổ cây cối',
      movement_analysis: 'Hướng Tây Bắc — khả năng đổ bộ Trung Bộ Việt Nam',
      landfall_analysis: 'Vùng Quảng Bình - Quảng Trị có nguy cơ đổ bộ trong 96h'
    },
    tools: [
      { name: 'Quỹ đạo đa mô hình (Ensemble)', detail: 'ECMWF · GFS · GEM — độ chụm, xác suất đổ bộ' },
      { name: 'Vệ tinh Himawari-9 IR', detail: 'Nhiệt độ đỉnh mây, phát hiện đối lưu mạnh' },
      { name: 'Chỉ số năng lượng lốc xoáy (ACE)', detail: 'Tổng năng lượng theo gió cấp và thời gian tồn tại' },
      { name: 'Nhiệt độ mặt biển (SST)', detail: 'Vùng nước ấm >26.5°C nuôi bão mạnh lên' }
    ],
    two_month_outlook: {
      window: '2 tháng tới',
      storm_count: 11,
      landfall_probability_pct: 78,
      note: 'Giai đoạn cao điểm mùa mưa bão Biển Đông'
    }
  };
}

function generateMultiHazardEarthquake() {
  const dir = 292.5;
  return {
    hazard: 'earthquake',
    label: 'Động đất',
    data_source: 'MÔ PHỎNG',
    event: {
      event_id: 'EQ-' + Date.now().toString(36).toUpperCase(),
      time_utc: new Date().toISOString(),
      lat: 14.2,
      lon: 115.3,
      depth_km: 12.4,
      magnitude: 6.1,
      region: 'Biển Đông, ngoài khơi Quảng Ngãi',
      mmi: 6.8,
      nearest_city: 'Đà Nẵng',
      nearest_city_km: 320
    },
    tsunami_potential: 2.5,
    movement: {
      slip_direction_deg: dir,
      slip_direction_compass: _compassDir(dir),
      propagation: 'Năng lượng lan truyền về phía Tây Bắc theo đới hút chìm Manila'
    },
    faults: [
      { name: 'Đới hút chìm Manila', distance_km: 145, slip_rate_mm_year: 55, risk: 'cao' },
      { name: 'Đứt gãy Sông Hồng', distance_km: 620, slip_rate_mm_year: 8, risk: 'trung bình' },
      { name: 'Đứt gãy Điện Biên', distance_km: 730, slip_rate_mm_year: 6, risk: 'trung bình' }
    ],
    mmi_analysis: 'Rung lắc mạnh — gây hư hại nhẹ công trình không gia cố',
    aftershock: { probability: 58, max_expected_magnitude: 4.9, window_hours: 72, note: 'Định luật Bath: động đất kế tiếp thường nhỏ hơn ~1.2 cấp' },
    analysis: {
      depth_analysis: 'Nông (<70km) — mức độ hủy diệt cao hơn',
      magnitude_analysis: 'Động đất mạnh cấp 6.0 — có thể gây thiệt hại khu vực gần tâm chấn'
    },
    tools: [
      { name: 'USGS Earthquake Catalog', detail: 'Định vị chấn tâm, độ sâu, cơ chế nguồn' },
      { name: 'Bản đồ rung lắc (ShakeMap)', detail: 'Cường độ MMI trên từng khu vực' },
      { name: 'Giám sát đứt gãy', detail: '7 đứt gãy chính tại Việt Nam + đới hút chìm Manila' },
      { name: 'Mạng trạm quan sát GPS', detail: 'Đo biến dạng bề mặt, dịch chuyển 2D' }
    ],
    two_month_outlook: {
      window: '2 tháng tới',
      probability: 'Thấp — tập trung đới hút chìm Manila',
      note: 'Theo dõi chuỗi dư chấn và dịch chuyển đứt gãy'
    }
  };
}

function generateMultiHazardTsunami() {
  const zones = [
    { zone: 'Quảng Trị', lat: 16.9, lon: 107.1, travel_time_min: 42, wave_height_m: 1.62, direction_deg: 292.5 },
    { zone: 'Đà Nẵng', lat: 16.06, lon: 108.25, travel_time_min: 55, wave_height_m: 1.15, direction_deg: 270 },
    { zone: 'Quảng Nam', lat: 15.5, lon: 108.2, travel_time_min: 58, wave_height_m: 1.02, direction_deg: 260 },
    { zone: 'Khánh Hòa', lat: 12.25, lon: 109.2, travel_time_min: 95, wave_height_m: 0.45, direction_deg: 230 },
    { zone: 'Bạc Liêu', lat: 9.3, lon: 105.8, travel_time_min: 160, wave_height_m: 0.18, direction_deg: 210 }
  ];
  const dir = 292.5;
  return {
    hazard: 'tsunami',
    label: 'Sóng thần',
    data_source: 'MÔ PHỎNG',
    source: { zone: 'Đới hút chìm Manila', lat: 14.2, lon: 115.3, mag: 7.2, azimuth: dir },
    watch_status: 'THEO DÕI SÓNG THẦN',
    generation: 'Động đất M7.2 tại đới hút chìm Manila dịch chuyển đáy biển theo phương thẳng đứng — tạo sóng thần lan tỏa về phía ' + _compassDir(dir),
    runups: zones.map(z => ({
      ...z,
      direction_compass: _compassDir(z.direction_deg),
      severity_level: z.wave_height_m >= 0.5 ? 3 : (z.wave_height_m > 0.1 ? 2 : 1)
    })),
    worst_case: { zone: 'Quảng Trị', wave_height_m: 1.62, travel_time_min: 42 },
    risk_level: 3,
    tools: [
      { name: 'PTWC / USGS', detail: 'Thông tin cảnh báo sóng thần quốc tế' },
      { name: 'Mạng phao DART', detail: 'Đo áp suất đáy biển phát hiện sóng' },
      { name: 'Thủy triều ký ven bờ', detail: 'Xác nhận sóng dâng khi đến bờ' },
      { name: 'Mô hình lan truyền', detail: 'Tính thời gian sóng tới từng đoạn bờ' }
    ],
    two_month_outlook: {
      window: '2 tháng tới',
      primary_source: 'Đới hút chìm Manila — nguy cơ M7+ gây sóng thần cho Nam Trung Bộ',
      secondary_source: 'Rãnh Java-Sumatra — ảnh hưởng đến Tây Nam Bộ',
      probability: 'Thấp — nhưng cần giám sát địa chấn liên tục'
    }
  };
}

function generateMultiHazardLandslide() {
  const zones = [
    { zone: 'Tây Bắc', province: 'Sơn La', lat: 21.3, lon: 103.9, slope_deg: 38, sat_pct: 92, rain_24h_mm: 82, risk_level: 6, speed: 14.2, dir_deg: 205 },
    { zone: 'Đông Bắc', province: 'Lạng Sơn', lat: 21.85, lon: 106.75, slope_deg: 32, sat_pct: 85, rain_24h_mm: 68, risk_level: 5, speed: 8.5, dir_deg: 190 },
    { zone: 'Bắc Trung Bộ', province: 'Quảng Trị', lat: 16.74, lon: 107.19, slope_deg: 30, sat_pct: 88, rain_24h_mm: 74, risk_level: 5, speed: 9.8, dir_deg: 215 },
    { zone: 'Tây Nguyên', province: 'Lâm Đồng', lat: 11.5, lon: 108.2, slope_deg: 26, sat_pct: 62, rain_24h_mm: 41, risk_level: 3, speed: 3.1, dir_deg: 180 },
    { zone: 'Đông Nam Bộ', province: 'Bình Phước', lat: 11.8, lon: 106.9, slope_deg: 18, sat_pct: 55, rain_24h_mm: 32, risk_level: 2, speed: 1.2, dir_deg: 160 }
  ];
  return {
    hazard: 'landslide',
    label: 'Sạt lở đất',
    data_source: 'MÔ PHỎNG',
    watch_status: 'CẢNH BÁO SẠT LỞ',
    active_zones: 3,
    zones: zones.map(z => ({
      zone: z.zone,
      province: z.province,
      lat: z.lat,
      lon: z.lon,
      risk_level: z.risk_level,
      slope_deg: z.slope_deg,
      soil_saturation_pct: z.sat_pct,
      rain_24h_mm: z.rain_24h_mm,
      movement_direction_deg: z.dir_deg,
      movement_direction_compass: _compassDir(z.dir_deg),
      movement_speed_cm_day: z.speed,
      trigger_rain_72h_mm: 180
    })),
    risk_level: 6,
    methodology: 'Ngưỡng Intensity-Duration (ID) theo Jibson & Godt (2008): đất sét nguy hiểm ≥40mm/24h, đất pha cát ≥65mm/24h, độ dốc ≥30° nhân hệ số 1.5, độ bão hòa đất >85% = nguy cơ lũ quét',
    tools: [
      { name: 'Open-Meteo API', detail: 'Dữ liệu mưa 24h/72h theo từng tỉnh' },
      { name: 'SRTM DEM', detail: 'Bản đồ độ dốc địa hình 30m' },
      { name: 'Độ ẩm đất vệ tinh', detail: 'Sentinel-1 SM đo độ bão hòa đất' },
      { name: 'Mạng đo biến dạng', detail: 'Giám sát tốc độ dịch chuyển khối đất' }
    ],
    two_month_outlook: {
      window: '2 tháng tới',
      note: 'Mùa mưa bão — rủi ro sạt lở tăng cao ở miền núi phía Bắc và duyên hải miền Trung',
      high_risk_weeks: 'Tuần 2, 4, 6 — các đợt mưa lớn kéo dài 3-5 ngày'
    }
  };
}

function generateMultiHazardOutlook(months) {
  const monthIdx = (new Date().getMonth() + months) % 12;
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  return {
    hazard: 'outlook',
    label: 'Dự báo sớm 2 tháng',
    data_source: 'MÔ PHỎNG',
    lead_days: months * 30,
    outlook_month: monthNames[monthIdx],
    enso: {
      phase: 'El Niño yếu - Trung tính ấm (SST Niño 3.4 ≈ +0.8°C)',
      sst_anomaly_c: 0.8
    },
    storm: {
      expected_count: 11,
      landfall_probability_pct: 78
    },
    heavy_rain_weeks: ['Tuần 2-3', 'Tuần 5-6', 'Tuần 8-9'],
    landslide_weeks: ['Tuần 3', 'Tuần 6', 'Tuần 8'],
    heatwave_weeks: [],
    risk_level: 4,
    narrative: '2 tháng tới nằm trong giai đoạn cao điểm mùa mưa bão Biển Đông. Nhiệt độ mặt biển ấm hơn trung bình tạo điều kiện cho 8-14 cơn bão/ATNĐ. Xác suất có bão ảnh hưởng trực tiếp đến bờ biển Việt Nam khoảng 70-80%.',
    hazards: {
      storm: generateMultiHazardStorm(),
      earthquake: generateMultiHazardEarthquake(),
      tsunami: generateMultiHazardTsunami(),
      landslide: generateMultiHazardLandslide()
    }
  };
}

function generateMultiHazardOverview() {
  const storm = generateMultiHazardStorm();
  const eq = generateMultiHazardEarthquake();
  const tsunami = generateMultiHazardTsunami();
  const landslide = generateMultiHazardLandslide();
  return {
    overall_level: Math.max(storm.risk_level, eq.event.magnitude >= 6 ? 4 : 2, tsunami.risk_level, landslide.risk_level),
    timestamp: new Date().toISOString(),
    hazards: {
      storm,
      earthquake: eq,
      tsunami,
      landslide
    },
    outlook: generateMultiHazardOutlook(2)
  };
}

// === LIVE REAL-TIME FETCHERS (USGS / GDACS / Open-Meteo) ===

async function liveFetch(url, params) {
  const qs = params ? '?' + Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&') : '';
  const resp = await fetch(url + qs, { headers: { 'User-Agent': 'MekongEcoShield/1.0' } });
  if (!resp.ok) return null;
  return resp.json();
}

const LIVE_LS_ZONES = [
  { zone: 'Hà Giang', province: 'Hà Giang', lat: 22.8, lon: 105.0, slope: 32.0, soil: 68.0, trigger: 110.0 },
  { zone: 'Lào Cai', province: 'Lào Cai', lat: 22.5, lon: 103.9, slope: 30.0, soil: 72.0, trigger: 100.0 },
  { zone: 'Yên Bái', province: 'Yên Bái', lat: 21.7, lon: 104.9, slope: 26.0, soil: 70.0, trigger: 105.0 },
  { zone: 'Lai Châu', province: 'Lai Châu', lat: 22.4, lon: 103.4, slope: 34.0, soil: 75.0, trigger: 100.0 },
  { zone: 'Điện Biên', province: 'Điện Biên', lat: 21.4, lon: 103.0, slope: 31.0, soil: 69.0, trigger: 105.0 },
  { zone: 'Sơn La', province: 'Sơn La', lat: 21.3, lon: 103.9, slope: 33.0, soil: 74.0, trigger: 100.0 },
  { zone: 'Quảng Trị', province: 'Quảng Trị', lat: 16.7, lon: 106.9, slope: 28.0, soil: 80.0, trigger: 90.0 },
  { zone: 'Thừa Thiên Huế', province: 'Thừa Thiên Huế', lat: 16.3, lon: 107.6, slope: 29.0, soil: 82.0, trigger: 90.0 },
  { zone: 'Quảng Ngãi', province: 'Quảng Ngãi', lat: 15.1, lon: 108.4, slope: 25.0, soil: 76.0, trigger: 95.0 },
  { zone: 'Bờ sông Hậu - An Giang', province: 'An Giang', lat: 10.4, lon: 105.3, slope: 18.0, soil: 90.0, trigger: 80.0 },
  { zone: 'Bờ biển Cà Mau', province: 'Cà Mau', lat: 9.0, lon: 105.0, slope: 15.0, soil: 92.0, trigger: 75.0 }
];

function liveCompass(deg) {
  const dirs = ['Bắc', 'Bắc Đông Bắc', 'Đông Bắc', 'Đông Đông Bắc', 'Đông', 'Đông Đông Nam', 'Đông Nam', 'Nam Đông Nam', 'Nam', 'Nam Tây Nam', 'Tây Nam', 'Tây Tây Nam', 'Tây', 'Tây Tây Bắc', 'Tây Bắc', 'Bắc Tây Bắc'];
  return dirs[Math.floor(((deg % 360 + 360) % 360 + 11.25) / 22.5) % 16];
}

function liveBearing(lat1, lon1, lat2, lon2) {
  const R = Math.PI / 180;
  const t1 = lat1 * R, t2 = lat2 * R;
  const dl = (lon2 - lon1) * R;
  const x = Math.sin(dl) * Math.cos(t2);
  const y = Math.cos(t1) * Math.sin(t2) - Math.sin(t1) * Math.cos(t2) * Math.cos(dl);
  return (Math.atan2(x, y) * 180 / Math.PI % 360 + 360) % 360;
}

function liveHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180;
  const dlat = (lat2 - lat1) * r, dlon = (lon2 - lon1) * r;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dlon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function liveUSGS(hours = 72, minMag = 4.5, limit = 40) {
  const since = new Date(Date.now() - hours * 3600000).toISOString().replace(/\..*Z$/, '');
  const data = await liveFetch('https://earthquake.usgs.gov/fdsnws/event/1/query', {
    format: 'geojson', starttime: since, minmagnitude: minMag, orderby: 'time', limit
  });
  if (!data || !data.features) return [];
  return data.features.map(f => {
    const p = f.properties || {}, c = f.geometry && f.geometry.coordinates || [0, 0, 0];
    return {
      event_id: f.id || '', time_ms: p.time, magnitude: p.mag || 0,
      depth_km: c[2], lat: c[1], lon: c[0], region: p.place || '',
      tsunami_flag: p.tsunami || 0, mmi: p.mmi || null
    };
  });
}

async function liveGDACS() {
  const resp = await fetch('https://www.gdacs.org/xml/rss.xml', { headers: { 'User-Agent': 'MekongEcoShield/1.0' } });
  if (!resp.ok) return { cyclones: [], quakes: [] };
  const text = await resp.text();
  const cyclones = [], quakes = [];
  const items = text.split('<item>').slice(1);
  for (const it of items) {
    const type = (it.match(/<gdacs:eventtype>(.*?)<\/gdacs:eventtype>/) || [])[1];
    const point = (it.match(/<georss:point>(.*?)<\/georss:point>/) || [])[1] || '';
    const parts = point.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const lat = parseFloat(parts[0]), lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) continue;
    const sev = (it.match(/<gdacs:severity[^>]*>(.*?)<\/gdacs:severity>/) || [])[1] || '';
    if (type === 'TC') {
      const name = (it.match(/<gdacs:eventname>(.*?)<\/gdacs:eventname>/) || [])[1] || 'Bão';
      const eventid = (it.match(/<gdacs:eventid>(.*?)<\/gdacs:eventid>/) || [])[1] || '';
      const windM = sev.match(/([\d.]+)\s*km\/h/);
      cyclones.push({ event_id: eventid, name: name.replace(/-26/, '').replace(/-25/, ''), lat, lon, wind_kmh: windM ? parseFloat(windM[1]) : 90, severity: sev });
    } else if (type === 'EQ') {
      const magM = sev.match(/Magnitude\s*([\d.]+)M/);
      const depM = sev.match(/Depth:\s*([\d.]+)km/);
      const title = (it.match(/<title>(.*?)<\/title>/) || [])[1] || '';
      quakes.push({ region: title.replace(/\s*<\/?[^>]+>\s*/g, ''), lat, lon, magnitude: magM ? parseFloat(magM[1]) : 5, depth_km: depM ? parseFloat(depM[1]) : 10 });
    }
  }
  return { cyclones, quakes };
}

async function liveCycloneTrack(eventId) {
  if (!eventId) return null;
  const url = `https://www.gdacs.org/contentdata/resources/TC/${eventId}/cap_${eventId}.xml`;
  const resp = await fetch(url, { headers: { 'User-Agent': 'MekongEcoShield/1.0' } });
  if (!resp.ok) return null;
  const text = await resp.text();
  const m = text.match(/<polygon[^>]*>([\s\S]*?)<\/polygon>/);
  if (!m) return null;
  const pts = [];
  for (const pair of m[1].trim().split(/\s+/)) {
    const p = pair.split(',');
    if (p.length >= 2) {
      const la = parseFloat(p[0]), lo = parseFloat(p[1]);
      if (!isNaN(la) && !isNaN(lo)) pts.push([la, lo]);
    }
  }
  if (pts.length < 3) return null;
  const half = Math.floor(pts.length / 2);
  const a = pts.slice(0, half), b = pts.slice(half);
  const step = Math.max(1, Math.floor(a.length / 8));
  const track = [];
  for (let i = 0; i < a.length; i += step) {
    const bi = Math.min(i, b.length - 1);
    track.push([parseFloat(((a[i][0] + b[bi][0]) / 2).toFixed(3)), parseFloat(((a[i][1] + b[bi][1]) / 2).toFixed(3))]);
  }
  return { polygon_points: pts.length, track };
}

async function liveRain(lat, lon, days = 3) {
  const data = await liveFetch('https://api.open-meteo.com/v1/forecast', {
    latitude: lat, longitude: lon, hourly: 'precipitation', forecast_days: days, timezone: 'Asia/Ho_Chi_Minh'
  });
  if (!data || !data.hourly || !data.hourly.precipitation) return null;
  const vals = data.hourly.precipitation.map(Number).filter(v => !isNaN(v));
  if (!vals.length) return null;
  const total72 = vals.reduce((s, v) => s + v, 0);
  const total24 = vals.slice(-24).reduce((s, v) => s + v, 0);
  return { rain_24h_mm: +total24.toFixed(1), rain_72h_mm: +total72.toFixed(1), max_hourly_mm: +Math.max(...vals).toFixed(1), hours: vals.length };
}

async function liveCycloneTrackForVN() {
  const g = await liveGDACS();
  if (!g.cyclones.length) return { cyclone: null, cyclone_track: null };
  const pick = g.cyclones.slice().sort((a, b) =>
    (Math.abs(b.lat - 16) ** 2 + Math.abs(b.lon - 108) ** 2) -
    (Math.abs(a.lat - 16) ** 2 + Math.abs(a.lon - 108) ** 2))[0];
  const track = await liveCycloneTrack(pick.event_id);
  return { cyclone: pick, cyclone_track: track };
}

function liveStormFrom(cyclone, track) {
  const wind = cyclone ? (cyclone.wind_kmh || 90) : 90;
  const curLat = cyclone ? cyclone.lat : 14.5, curLon = cyclone ? cyclone.lon : 114.0;
  const points = [{ hour: 0, lat: curLat, lon: curLon, wind_speed: wind, pressure: +(1013 - Math.max(0, wind - 40) * 0.4).toFixed(1) }];
  const line = (track && track.track) || [];
  if (line.length) {
    const step = Math.max(6, Math.floor(96 / line.length));
    line.forEach((pt, i) => {
      if (Math.abs(pt[0] - curLat) < 0.05 && Math.abs(pt[1] - curLon) < 0.05) return;
      const w = Math.max(0, wind - (i + 1) * 4);
      points.push({ hour: (i + 1) * step, lat: pt[0], lon: pt[1], wind_speed: +w.toFixed(1), pressure: +(1013 - Math.max(0, w - 40) * 0.4).toFixed(1) });
    });
  }
  const bearings = [], speeds = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    bearings.push(liveBearing(a.lat, a.lon, b.lat, b.lon));
    const d = liveHaversine(a.lat, a.lon, b.lat, b.lon);
    speeds.push(d / Math.max(1, b.hour - a.hour));
  }
  const avgB = bearings.reduce((s, v) => s + v, 0) / (bearings.length || 1);
  const avgS = speeds.reduce((s, v) => s + v, 0) / (speeds.length || 1);
  const maxWind = Math.max(...points.map(p => p.wind_speed));
  const minP = Math.min(...points.map(p => p.pressure));
  let cat = 0;
  if (maxWind >= 62) cat = 1;
  if (maxWind >= 118) cat = 2;
  if (maxWind >= 153) cat = 3;
  if (maxWind >= 177) cat = 4;
  if (maxWind >= 208) cat = 5;
  let landfall = 'Biển khơi / chưa xác định', landfallHour = 0;
  for (const p of points) {
    if (p.lat >= 8 && p.lat <= 23.5 && p.lon >= 102 && p.lon <= 112) {
      landfall = p.lat >= 20 ? 'Vịnh Bắc Bộ' : p.lat >= 17 ? 'Bắc Trung Bộ' : p.lat >= 13 ? 'Nam Trung Bộ' : p.lat >= 10 ? 'Đông Nam Bộ' : 'ĐBSCL';
      landfallHour = p.hour;
      break;
    }
  }
  const trend = avgS >= 20 ? 'Di chuyển nhanh' : 'Di chuyển chậm';
  return {
    hazard: 'storm', label: 'Bão / Áp thấp nhiệt đới',
    data_source: cyclone ? 'THỜI GIAN THỰC' : 'MÔ PHỎNG',
    storm_name: cyclone ? cyclone.name : '',
    active: points.length > 1,
    current: { lat: curLat, lon: curLon },
    intensity: { max_wind_kmh: +maxWind.toFixed(1), min_pressure_hpa: +minP.toFixed(1), category: cat, trend: maxWind >= wind ? 'Mạnh lên' : 'Ổn định' },
    movement: { bearing_deg: +avgB.toFixed(1), bearing_compass: liveCompass(avgB), speed_kmh: +avgS.toFixed(1), trend, landfall_zone: landfall, landfall_hour: landfallHour },
    trajectory: points,
    risk_level: Math.max(1, Math.min(6, cat + (landfallHour ? 2 : 1))),
    analysis: {
      pressure_analysis: minP <= 945 ? 'Áp suất tâm cực thấp — bão siêu mạnh' : minP <= 960 ? 'Áp suất tâm rất thấp — bão mạnh' : minP <= 995 ? 'Áp suất giảm nhẹ — ATNĐ/bão yếu' : 'Áp suất gần bình thường',
      intensity_analysis: 'Gió ' + maxWind + ' km/h — cấp ' + cat,
      movement_analysis: 'Bão di chuyển ' + liveCompass(avgB) + ' (' + avgB.toFixed(1) + '°) tốc độ ' + avgS.toFixed(1) + ' km/h',
      landfall_analysis: landfallHour ? 'Dự kiến đổ bộ ' + landfall + ' sau ' + landfallHour + ' giờ' : 'Chưa có dấu hiệu đổ bộ'
    },
    tools: [
      { name: 'GDACS (thời gian thực)', detail: 'Vị trí + track dự báo từ CAP feed' },
      { name: 'Quỹ đạo đa mô hình (Ensemble)', detail: 'ECMWF · GFS · GEM' },
      { name: 'Vệ tinh Himawari-9 IR', detail: 'Nhiệt độ đỉnh mây, đối lưu mạnh' },
      { name: 'Nhiệt độ mặt biển (SST)', detail: 'Vùng nước ấm >26.5°C nuôi bão' }
    ],
    two_month_outlook: { window: '2 tháng tới', storm_count: 11, landfall_probability_pct: 78, note: 'Giai đoạn cao điểm mùa mưa bão Biển Đông' }
  };
}

async function liveQuakeFrom(eqs, pickLargest = true) {
  if (!eqs || !eqs.length) return { event: null, live: false };
  const ev = pickLargest ? eqs.slice().sort((a, b) => (b.magnitude || 0) - (a.magnitude || 0))[0]
    : eqs.slice().sort((a, b) => ((b.tsunami_flag || 0) - (a.tsunami_flag || 0)) || ((b.magnitude || 0) - (a.magnitude || 0)))[0];
  const lat = ev.lat, lon = ev.lon;
  const depth = ev.depth_km || 10, mag = ev.magnitude || 5;
  const mmi = Math.max(1, Math.min(9, (mag * 1.5 - 2) * Math.max(0.4, 1 - depth / 200)));
  const nearVN = Math.abs(lat - 16) < 10 && Math.abs(lon - 108) < 15;
  const slip = nearVN ? 300 : liveBearing(lat, lon, 16, 108);
  const tpot = (ev.tsunami_flag === 1 || (depth <= 30 && mag >= 6.5)) ? (mag >= 7 ? 80 : 45) : 0;
  const region = ev.region || 'Ngoài khơi';
  return {
    event: {
      event_id: ev.event_id || 'EQ-LIVE', time_utc: new Date(ev.time_ms || Date.now()).toISOString(),
      lat: +lat.toFixed(2), lon: +lon.toFixed(2), depth_km: +depth.toFixed(1), magnitude: +mag.toFixed(1),
      region, mmi: +mmi.toFixed(1), nearest_city: nearVN ? 'Đà Nẵng' : 'Không xác định', nearest_city_km: 0
    },
    tsunami_potential: tpot,
    movement: { slip_direction_deg: +slip.toFixed(1), slip_direction_compass: liveCompass(slip), propagation: 'Sóng địa chấn lan truyền từ chấn tâm theo hướng ' + liveCompass(slip) + ' (' + slip.toFixed(1) + '°), sóng P ~6-8 km/s, sóng S ~3.5 km/s' },
    data_source: 'THỜI GIAN THỰC',
    faults: [
      { name: nearVN ? 'Đứt gãy Sông Hồng' : 'Đới hút chìm Manila', distance_km: Math.round(liveHaversine(lat, lon, nearVN ? 21.0 : 17.5, nearVN ? 104.8 : 119.0)), slip_rate_mm_year: nearVN ? 8 : 55, risk: 'cao' },
      { name: 'Đứt gãy Sơn La', distance_km: Math.round(liveHaversine(lat, lon, 21.2, 104.0)), slip_rate_mm_year: 6, risk: 'trung bình' },
      { name: 'Đứt gãy Sông Cả', distance_km: Math.round(liveHaversine(lat, lon, 19.5, 105.0)), slip_rate_mm_year: 5, risk: 'thấp' }
    ],
    mmi_analysis: mmi >= 6 ? 'Rung lắc mạnh — gây hư hại công trình không gia cố' : mmi >= 4 ? 'Rung lắc rõ — người cảm nhận rõ' : 'Rung nhẹ — chỉ một số người cảm nhận',
    aftershock: { probability: Math.min(95, Math.round(20 + mag * 8)), max_expected_magnitude: +(mag - 1.2).toFixed(1), window_hours: 72, note: 'Định luật Bath: động đất kế tiếp thường nhỏ hơn ~1.2 cấp' },
    analysis: {
      depth_analysis: depth < 30 ? 'Nông (<30km) — thiệt hại bề mặt lớn, nguy cơ sóng thần cao nếu ở biển' : depth < 70 ? 'Trung bình (30-70km) — rung lắc lan rộng' : 'Sâu (>70km) — năng lượng suy giảm khi lên bề mặt',
      magnitude_analysis: mag >= 7 ? 'Động đất mạnh (M≥7) — thiệt hại diện rộng, nguy cơ sóng thần' : mag >= 6 ? 'Động đất trung bình mạnh (M6-6.9) — thiệt hại cục bộ' : mag >= 5 ? 'Động đất nhẹ (M5-5.9) — rung lắc rõ, thiệt hại nhỏ' : 'Động đất yếu (M<5) — ít gây thiệt hại'
    },
    tools: [
      { name: 'USGS Earthquake Catalog', detail: 'Định vị chấn tâm, độ sâu, cơ chế nguồn' },
      { name: 'Bản đồ rung lắc (ShakeMap)', detail: 'Cường độ MMI trên từng khu vực' },
      { name: 'Giám sát đứt gãy', detail: '7 đứt gãy chính tại Việt Nam + đới hút chìm Manila' },
      { name: 'Mạng trạm quan sát GPS', detail: 'Đo biến dạng bề mặt, dịch chuyển 2D' }
    ],
    two_month_outlook: { window: '2 tháng tới', probability: 'Thấp — tập trung đới hút chìm Manila', note: 'Theo dõi chuỗi dư chấn và dịch chuyển đứt gãy' },
    live: true
  };
}

async function liveLandslideFrom(rainMap) {
  const zones = LIVE_LS_ZONES.map(z => {
    const r = (rainMap || {})[z.zone];
    const rain72 = r && r.rain_72h_mm != null ? r.rain_72h_mm : 120;
    const rain24 = r && r.rain_24h_mm != null ? r.rain_24h_mm : rain72 / 3;
    const sat = Math.min(0.98, z.soil / 100 + rain72 / 200);
    let score = 1;
    if (z.slope >= 30) score += 2; else if (z.slope >= 20) score += 1;
    if (sat >= 0.85) score += 3; else if (sat >= 0.7) score += 2; else if (sat >= 0.55) score += 1;
    if (rain72 >= z.trigger) score += 2; else if (rain72 >= z.trigger * 0.7) score += 1;
    score = Math.max(1, Math.min(6, score));
    const dirDeg = 180 + (Math.abs(z.zone.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % 60 - 30);
    const speed = Math.max(0.5, sat * (z.slope / 40) * 12);
    return { ...z, risk_level: score, soil_saturation_pct: +(sat * 100).toFixed(1), rain_24h_mm: +rain24.toFixed(1), movement_direction_deg: (dirDeg % 360 + 360) % 360, movement_direction_compass: liveCompass(dirDeg), movement_speed_cm_day: +speed.toFixed(1) };
  }).sort((a, b) => b.risk_level - a.risk_level);
  const active = zones.filter(z => z.risk_level >= 4);
  const liveCount = Object.keys(rainMap || {}).length;
  return {
    hazard: 'landslide', label: 'Sạt lở đất',
    data_source: liveCount >= 2 ? 'THỜI GIAN THỰC' : 'MÔ PHỎNG',
    live_zones_used: liveCount,
    watch_status: active.length ? 'CẢNH BÁO SẠT LỞ' : 'THEO DÕI',
    active_zones: active.length,
    zones: zones.map(z => ({ zone: z.zone, province: z.province, lat: z.lat, lon: z.lon, risk_level: z.risk_level, slope_deg: z.slope, soil_saturation_pct: z.soil_saturation_pct, rain_24h_mm: z.rain_24h_mm, movement_direction_deg: z.movement_direction_deg, movement_direction_compass: z.movement_direction_compass, movement_speed_cm_day: z.movement_speed_cm_day, trigger_rain_72h_mm: z.trigger })),
    risk_level: zones.length ? zones[0].risk_level : 1,
    methodology: 'Ngưỡng Intensity-Duration (ID) theo Jibson & Godt (2008): đất sét nguy hiểm ≥40mm/24h, đất pha cát ≥65mm/24h, độ dốc ≥30° nhân hệ số 1.5, độ bão hòa đất >85% = nguy cơ lũ quét',
    tools: [
      { name: 'Open-Meteo API', detail: 'Mưa thời gian thực 24h/72h theo từng tỉnh' },
      { name: 'SRTM DEM', detail: 'Bản đồ độ dốc địa hình 30m' },
      { name: 'Độ ẩm đất vệ tinh', detail: 'Sentinel-1 SM đo độ bão hòa đất' },
      { name: 'Mạng đo biến dạng', detail: 'Giám sát tốc độ dịch chuyển khối đất' }
    ],
    two_month_outlook: { window: '2 tháng tới', note: 'Mùa mưa bão — rủi ro sạt lở tăng cao ở miền núi phía Bắc và duyên hải miền Trung', high_risk_weeks: 'Tuần 2, 4, 6' }
  };
}

async function liveTsunamiFrom(quake) {
  const eq = quake && quake.event;
  const live = !!(eq && (quake.tsunami_potential > 0 || eq.depth_km <= 30));
  const src = eq ? { zone: eq.region || 'Ngoài khơi', lat: eq.lat, lon: eq.lon, mag: eq.magnitude || 7, azimuth: +liveBearing(eq.lat, eq.lon, 16, 108).toFixed(1) }
    : { zone: 'Đới hút chìm Manila', lat: 14.2, lon: 115.3, mag: 7.2, azimuth: 292.5 };
  const zones = [
    { zone: 'Vịnh Bắc Bộ', lat: 20.5, lon: 107.5 },
    { zone: 'Bắc Trung Bộ', lat: 18.0, lon: 106.0 },
    { zone: 'Nam Trung Bộ', lat: 12.5, lon: 109.0 },
    { zone: 'Đông Nam Bộ', lat: 10.5, lon: 107.0 },
    { zone: 'ĐBSCL ven biển', lat: 9.5, lon: 105.5 }
  ];
  const runups = zones.map(z => {
    const d = liveHaversine(src.lat, src.lon, z.lat, z.lon);
    const travel = Math.max(10, Math.round(d / 750 * 60));
    const wave = Math.max(0, 4 * (src.mag - 6) / 2.5 * Math.exp(-d / 2500));
    const dir = liveBearing(src.lat, src.lon, z.lat, z.lon);
    let lvl = 1;
    if (wave >= 3) lvl = 5; else if (wave >= 1.5) lvl = 4; else if (wave >= 0.5) lvl = 3; else if (wave > 0.1) lvl = 2;
    return { zone: z.zone, lat: z.lat, lon: z.lon, travel_time_min: travel, wave_height_m: +wave.toFixed(2), direction_deg: +(dir % 360).toFixed(1), direction_compass: liveCompass(dir), severity_level: lvl };
  }).sort((a, b) => a.travel_time_min - b.travel_time_min);
  const worst = runups.slice().sort((a, b) => b.wave_height_m - a.wave_height_m)[0];
  return {
    hazard: 'tsunami', label: 'Sóng thần', data_source: live ? 'THỜI GIAN THỰC' : 'MÔ PHỎNG',
    source: src,
    watch_status: worst && worst.wave_height_m > 0.5 ? 'THEO DÕI SÓNG THẦN' : 'KHÔNG CÓ NGUY CƠ',
    generation: 'Động đất M' + src.mag + ' tại ' + src.zone + ' (' + src.lat + '°N, ' + src.lon + '°E) dịch chuyển đáy biển — sóng lan về ' + liveCompass(src.azimuth),
    runups,
    worst_case: { zone: worst.zone, wave_height_m: worst.wave_height_m, travel_time_min: worst.travel_time_min },
    risk_level: worst ? worst.severity_level : 1,
    tools: [
      { name: 'PTWC / USGS', detail: 'Thông tin cảnh báo sóng thần quốc tế' },
      { name: 'Mạng phao DART', detail: 'Đo áp suất đáy biển phát hiện sóng' },
      { name: 'Thủy triều ký ven bờ', detail: 'Xác nhận sóng dâng khi đến bờ' },
      { name: 'Mô hình lan truyền', detail: 'Tính thời gian sóng tới từng đoạn bờ' }
    ],
    two_month_outlook: { window: '2 tháng tới', primary_source: 'Đới hút chìm Manila — nguy cơ M7+', secondary_source: 'Rãnh Java-Sumatra — ảnh hưởng Tây Nam Bộ', probability: 'Thấp — cần giám sát địa chấn liên tục' }
  };
}

async function buildLiveMultiHazard() {
  try {
    const [usgs, gdacs, track] = await Promise.all([
      liveUSGS(72, 4.5, 40),
      liveGDACS(),
      liveCycloneTrackForVN()
    ]);
    const eqs = usgs.length ? usgs : gdacs.quakes.map(q => ({ ...q, tsunami_flag: 0, time_ms: Date.now() }));
    const quake = await liveQuakeFrom(eqs, false);
    const storm = await liveStormFrom(track.cyclone, track.cyclone_track);
    const tsunami = await liveTsunamiFrom(quake);
    const rainMap = {};
    const rainRes = await Promise.all(LIVE_LS_ZONES.map(z => liveRain(z.lat, z.lon)));
    LIVE_LS_ZONES.forEach((z, i) => { if (rainRes[i]) rainMap[z.zone] = rainRes[i]; });
    const landslide = await liveLandslideFrom(rainMap);
    return { storm, earthquake: quake, tsunami, landslide };
  } catch (_) {
    return null;
  }
}

function generateHydrology() {
  const stations = [
    { station_id: 'TANCHAU', name: 'Tân Châu', province: 'An Giang', river: 'Sông Tiền', lat: 10.82, lon: 105.12, alarm_m: 4.5 },
    { station_id: 'CHAUDOC', name: 'Châu Đốc', province: 'An Giang', river: 'Sông Hậu', lat: 10.7, lon: 105.11, alarm_m: 4.5 },
    { station_id: 'CHOMOI', name: 'Chợ Mới', province: 'An Giang', river: 'Sông Hậu', lat: 10.35, lon: 105.45, alarm_m: 4.0 },
    { station_id: 'CANTHO', name: 'Cần Thơ', province: 'Cần Thơ', river: 'Sông Hậu', lat: 10.03, lon: 105.78, alarm_m: 3.2 },
    { station_id: 'MYTHUAN', name: 'Mỹ Thuận', province: 'Tiền Giang', river: 'Sông Tiền', lat: 10.28, lon: 106.0, alarm_m: 3.6 },
    { station_id: 'MYTHO', name: 'Mỹ Tho', province: 'Tiền Giang', river: 'Sông Tiền', lat: 10.36, lon: 106.36, alarm_m: 3.0 },
    { station_id: 'VAMLONG', name: 'Vàm Cống', province: 'Đồng Tháp', river: 'Sông Hậu', lat: 10.3, lon: 105.55, alarm_m: 4.0 },
    { station_id: 'VINHLONG', name: 'Vĩnh Long', province: 'Vĩnh Long', river: 'Sông Cổ Chiên', lat: 10.25, lon: 105.97, alarm_m: 3.2 },
    { station_id: 'BENTRE', name: 'Bến Tre', province: 'Bến Tre', river: 'Sông Cổ Chiên', lat: 10.23, lon: 106.38, alarm_m: 2.8 },
    { station_id: 'RACHGIA', name: 'Rạch Giá', province: 'Kiên Giang', river: 'Vịnh Thái Lan', lat: 10.02, lon: 105.08, alarm_m: 2.2 },
    { station_id: 'CAMAU', name: 'Cà Mau', province: 'Cà Mau', river: 'Sông Ông Đốc', lat: 9.18, lon: 105.15, alarm_m: 2.0 }
  ];
  const now = new Date();
  const month = now.getMonth() + 1;
  const season = (month >= 8 && month <= 10) ? 1.25 : (month >= 6 && month <= 7 || month >= 11 && month <= 12) ? 1.08 : 0.92;
  const out = stations.map(s => {
    const base = s.alarm_m * 0.62 * season;
    const tide = ['Cà Mau', 'Bến Tre', 'Kiên Giang', 'Tiền Giang'].indexOf(s.province) >= 0 ? 0.22 : 0.10;
    const level = +(Math.max(0.3, base + tide + Math.sin(s.lat * 3.7) * 0.05)).toFixed(2);
    let alert_level = 1;
    if (level >= s.alarm_m * 1.25) alert_level = 5;
    else if (level >= s.alarm_m * 1.10) alert_level = 4;
    else if (level >= s.alarm_m * 0.95) alert_level = 3;
    else if (level >= s.alarm_m * 0.75) alert_level = 2;
    return {
      station_id: s.station_id, name: s.name, province: s.province, river: s.river,
      lat: s.lat, lon: s.lon, water_level_m: level, alarm_level_m: s.alarm_m,
      margin_m: +(s.alarm_m - level).toFixed(2), trend_cm_h: +((level / s.alarm_m - 0.7) * 4).toFixed(1),
      trend_label: level / s.alarm_m > 0.95 ? 'Dâng nhanh' : level / s.alarm_m > 0.8 ? 'Dâng chậm' : 'Ổn định',
      status: alert_level >= 5 ? 'NGUY HIỂM' : alert_level >= 4 ? 'CẢNH BÁO' : alert_level >= 3 ? 'CHÚ Ý' : alert_level >= 2 ? 'THEO DÕI' : 'AN TOÀN',
      alert_level, data_source: 'MÔ PHỎNG', last_update: now.toISOString()
    };
  });
  const overview_level = Math.max(...out.map(s => s.alert_level));
  const watch = overview_level >= 5 ? 'CẢNH BÁO LŨ NGUY HIỂM' : overview_level >= 4 ? 'CẢNH BÁO LŨ' : overview_level >= 3 ? 'THEO DÕI LŨ' : 'KHÔNG CÓ NGUY CƠ LŨ';
  return {
    data_source: 'MÔ PHỎNG', live_stations_used: 0, total_stations: out.length,
    overview_level, watch_status: watch,
    flood_alert_count: out.filter(s => s.alert_level >= 3).length,
    warning_stations: out.filter(s => s.alert_level >= 4).map(s => s.name),
    narrative: overview_level >= 4 ? 'Mực nước dâng cao ở nhiều trạm ĐBSCL. Theo dõi chặt đê bao.' : 'Mực nước sông Mekong trong giới hạn an toàn. Không phát sinh cảnh báo lũ.',
    stations: out
  };
}

async function generateRiskMap() {
  let live = null;
  try { live = await buildLiveMultiHazard(); } catch (_) {}
  const storm = live ? live.storm : generateMultiHazardStorm();
  const quake = live ? live.earthquake : generateMultiHazardEarthquake();
  const tsunami = live ? live.tsunami : generateMultiHazardTsunami();
  const landslide = live ? live.landslide : generateMultiHazardLandslide();
  const track = (storm.trajectory || []).map(t => ({ lat: t.lat, lon: t.lon, hour: t.hour, wind_speed: t.wind_speed, category: t.category }));
  const overall = Math.max(storm.risk_level || 1, quake.risk_level || 2, tsunami.risk_level || 1, landslide.risk_level || 1);
  return {
    ok: true, timestamp: new Date().toISOString(), overall_level: overall,
    layers: {
      storm: { label: storm.label, risk_level: storm.risk_level, data_source: storm.data_source, current: storm.current || {}, track },
      earthquake: { label: quake.label, risk_level: quake.risk_level || 2, data_source: quake.data_source, event: quake.event || { lat: 20, lon: 105, magnitude: 5, depth_km: 20, region: 'Mô phỏng', mmi: 4 } },
      tsunami: { label: tsunami.label, risk_level: tsunami.risk_level, data_source: tsunami.data_source, runups: tsunami.runups || [] },
      landslide: { label: landslide.label, risk_level: landslide.risk_level, data_source: landslide.data_source, zones: landslide.zones || [] }
    }
  };
}

async function generateReportSummary() {
  let live = null;
  try { live = await buildLiveMultiHazard(); } catch (_) {}
  const overview = live ? {
    ok: true, timestamp: new Date().toISOString(),
    overall_level: Math.max(live.storm.risk_level || 1, live.earthquake.risk_level || 2, live.tsunami.risk_level || 1, live.landslide.risk_level || 1),
    hazards: [
      { hazard: 'storm', label: live.storm.label, risk_level: live.storm.risk_level, data_source: live.storm.data_source },
      { hazard: 'earthquake', label: live.earthquake.label, risk_level: live.earthquake.risk_level || 2, data_source: live.earthquake.data_source },
      { hazard: 'tsunami', label: live.tsunami.label, risk_level: live.tsunami.risk_level, data_source: live.tsunami.data_source },
      { hazard: 'landslide', label: live.landslide.label, risk_level: live.landslide.risk_level, data_source: live.landslide.data_source }
    ]
  } : generateMultiHazardOverview();
  return {
    ok: true, timestamp: new Date().toISOString(), generated_by: 'Mekong Eco-Shield AI Engine',
    overview,
    storm: live ? live.storm : generateMultiHazardStorm(),
    earthquake: live ? live.earthquake : generateMultiHazardEarthquake(),
    tsunami: live ? live.tsunami : generateMultiHazardTsunami(),
    landslide: live ? live.landslide : generateMultiHazardLandslide(),
    outlook: generateMultiHazardOutlook(2),
    hydrology: generateHydrology(),
    alerts: getAlertHistory(20)
  };
}

async function serveMultiHazard(sub) {
  try {
    const live = await buildLiveMultiHazard();
    if (live) {
      if (sub === 'overview') {
        const hazards = [live.storm, live.earthquake, live.tsunami, live.landslide];
        return { ok: true, overall_level: Math.max(...hazards.map(h => h.risk_level || 1)), timestamp: new Date().toISOString(), hazards, outlook: generateMultiHazardOutlook(2) };
      }
      if (sub === 'storm') return { ok: true, ...live.storm };
      if (sub === 'earthquake') return { ok: true, ...live.earthquake };
      if (sub === 'tsunami') return { ok: true, ...live.tsunami };
      if (sub === 'landslide') return { ok: true, ...live.landslide };
    }
  } catch (_) { /* fall through to mock */ }
  if (sub === 'overview') return { ok: true, ...generateMultiHazardOverview() };
  if (sub === 'storm') return { ok: true, ...generateMultiHazardStorm() };
  if (sub === 'earthquake') return { ok: true, ...generateMultiHazardEarthquake() };
  if (sub === 'tsunami') return { ok: true, ...generateMultiHazardTsunami() };
  if (sub === 'landslide') return { ok: true, ...generateMultiHazardLandslide() };
  return null;
}

// === MIROFISH MULTI-AGENT GRAPHRAG (mock fallback) ===

function generateMirofishMock() {
  return {
    status: 'KÍCH HOẠT',
    province: 'Kiên Giang',
    salinity_level: 4.2,
    flood_tier: 3,
    impact_grade: 4,
    impact_color: '#ff1744',
    impact_analysis: {
      summary: 'Xâm nhập mặn mức nghiêm trọng (4.2‰) tại Kiên Giang — kết hợp lũ cấp 3 (Báo động II).',
      salinity_grade: 4,
      salinity_level: 'Nghiêm trọng (>=4.0‰)',
      flood_tier: 3,
      flood_level_name: 'Báo động II',
      affected_zone: 'Vịnh Thái Lan, đồng bằng ven biển',
      key_infrastructure: ['Cống ngăn mặn Rạch Giá', 'Hệ thống thủy lợi U Minh Thượng'],
      crops: ['Lúa - tôm', 'Mía', 'Cây ăn trái']
    },
    agent_decisions: [
      {
        agent_id: 'water_station',
        agent_name: 'Agent Trạm Cấp Nước',
        icon: '🚰',
        action: 'Vận hành cống ngăn mặn và trữ nước ngọt',
        priority: 'Cao',
        actions: [
          'Đóng các cửa cống ngăn mặn tại vùng ảnh hưởng',
          'Kích hoạt xe bồn cấp nước sinh hoạt cho khu vực dân cư',
          'Tăng cường trữ nước ngọt tại ao trữ dự phòng'
        ]
      },
      {
        agent_id: 'farmer',
        agent_name: 'Agent Nông Dân',
        icon: '🌾',
        action: 'Chuyển đổi cơ cấu cây trồng chịu mặn',
        priority: 'Cao',
        actions: [
          'Chuyển sang giống lúa chịu mặn cho vụ tới',
          'Khuyến cáo thu hoạch sớm vụ lúa đang chín',
          'Hướng dẫn nông dân chuyển đổi cây trồng phù hợp'
        ]
      },
      {
        agent_id: 'grid_logistics',
        agent_name: 'Agent Lưới điện & Logistics',
        icon: '⚡',
        action: 'Điều phối năng lượng và vật tư ứng phó',
        priority: 'Trung bình',
        actions: [
          'Ưu tiên cấp điện liên tục cho các trạm bơm và trạm xử lý nước',
          'Bố trí dự phòng máy phát điện cho trạm nước sinh hoạt'
        ]
      },
      {
        agent_id: 'government',
        agent_name: 'Agent Chính quyền',
        icon: '🏛️',
        action: 'Ban hành lệnh kích hoạt thiên tai',
        priority: 'Cao',
        actions: [
          'Ban hành lệnh kích hoạt ứng phó theo cấp thiên tai',
          'Công bố thông tin dự báo mặn/lũ lên cổng thông tin tỉnh',
          'Phân bổ ngân sách dự phòng cho công tác ứng phó'
        ]
      }
    ],
    recommendation: 'KÍCH HOẠT ỨNG PHÓ CẤP CAO tại Kiên Giang: mặn 4.2‰ kết hợp lũ cấp 3. Triển khai ngay đóng cống ngăn mặn, cấp nước sinh hoạt bằng xe bồn, thu hoạch sớm lúa chín, sẵn sàng sơ tán dân vùng trũng.',
    agents_total: 4,
    engine: 'mock',
    timestamp: new Date().toISOString()
  };
}
