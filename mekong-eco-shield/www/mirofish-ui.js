/**
 * Mekong Eco-Shield — MiroFish Multi-Agent GraphRAG Bridge UI
 * Kích hoạt mô phỏng đa tác nhân ứng phó thiên tai ĐBSCL qua MiroFish.
 * Gọi endpoint /api/mirofish/* được proxy bởi _worker.js (fallback mock khi backend offline).
 */

(function() {
  const MIROFISH_API = '/api/mirofish';

  const PROVINCES = ['Kiên Giang', 'Bến Tre', 'Sóc Trăng', 'Cà Mau', 'An Giang', 'Đồng Tháp', 'Cần Thơ', 'Tiền Giang', 'Vĩnh Long', 'Long An', 'Trà Vinh', 'Bạc Liêu', 'Hậu Giang'];

  const MIROFISH_PAGES = {
    'mirofishSim': {
      label: '🧠 Mô phỏng Đa Đại lý',
      render: function() {
        return `
          <div class="pt">🧠 Mô phỏng Đa Đại lý (GraphRAG) — MiroFish Bridge</div>
          <div class="ps">DANH ĐẠT (SÓI CÔ ĐỘC) — Agent tự động phản ứng theo ngưỡng mặn/lũ ĐBSCL</div>

          <div style="background:linear-gradient(135deg,rgba(124,77,255,.08),rgba(0,200,83,.05));border:1px solid rgba(124,77,255,.2);border-radius:12px;padding:14px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:600;margin-bottom:8px">🎯 Kịch bản thiên tai</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
              <div>
                <div style="font-size:10px;color:#607d8b;margin-bottom:4px">Tỉnh / Thành phố</div>
                <select id="mfProvince" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px">
                  ${PROVINCES.map(p => `<option value="${p}"${p === 'Kiên Giang' ? ' selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
              <div>
                <div style="font-size:10px;color:#607d8b;margin-bottom:4px">Độ mặn (‰)</div>
                <input id="mfSalinity" type="number" step="0.1" min="0" max="20" value="4.2"
                  style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px">
              </div>
              <div>
                <div style="font-size:10px;color:#607d8b;margin-bottom:4px">Cấp lũ (0–4)</div>
                <select id="mfFloodTier" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px">
                  <option value="0">0 — Bình thường</option>
                  <option value="1">1 — Theo dõi</option>
                  <option value="2">2 — Báo động I</option>
                  <option value="3" selected>3 — Báo động II</option>
                  <option value="4">4 — Báo động III</option>
                </select>
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
              <button class="btn bp" onclick="window.runMirofishDemo && runMirofishDemo('Kiên Giang', 4.2, 3)">🚨 Demo: Kiên Giang mặn 4.2‰, lũ cấp 3</button>
              <button class="btn bp" onclick="triggerMirofish()">🚀 Kích hoạt Mô phỏng Đa Đại lý</button>
            </div>
          </div>

          <div id="mfResult">
            <div class="cc"><h3>🛰️ Hệ thống chưa kích hoạt</h3>
              <div style="font-size:12px;color:#607d8b;margin-top:6px">
                Bấm <b>Kích hoạt Mô phỏng Đa Đại lý</b> để gọi MiroFish GraphRAG. Vệ tinh (Copernicus/Bi-LSTM) phát hiện
                mặn ≥ ngưỡng → Multi-Agent đưa quyết định → AI Engine gọi điện cảnh báo.
              </div>
            </div>
          </div>
        `;
      }
    }
  };

  window.triggerMirofish = function() {
    const province = document.getElementById('mfProvince') ? document.getElementById('mfProvince').value : 'Kiên Giang';
    const salinity = document.getElementById('mfSalinity') ? parseFloat(document.getElementById('mfSalinity').value) : 4.2;
    const floodTier = document.getElementById('mfFloodTier') ? parseInt(document.getElementById('mfFloodTier').value, 10) : 3;
    loadMirofishSimulation(province, salinity, floodTier);
  };

  window.runMirofishDemo = function(province, salinity, floodTier) {
    if (document.getElementById('mfProvince')) document.getElementById('mfProvince').value = province;
    if (document.getElementById('mfSalinity')) document.getElementById('mfSalinity').value = salinity;
    if (document.getElementById('mfFloodTier')) document.getElementById('mfFloodTier').value = floodTier;
    loadMirofishSimulation(province, salinity, floodTier);
  };

  async function loadMirofishSimulation(province, salinity, floodTier) {
    const result = document.getElementById('mfResult');
    if (!result) return;
    result.innerHTML = `<div class="cc"><h3>⏳ Đang kích hoạt Multi-Agent...</h3>
      <div style="font-size:12px;color:#607d8b;margin-top:6px">GraphRAG đang truy vấn tri thức ĐBSCL · ${province} · mặn ${salinity}‰ · lũ cấp ${floodTier}</div></div>`;

    try {
      const resp = await fetch(`${MIROFISH_API}/mekong-trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ province, salinity_level: salinity, flood_tier: floodTier })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'MiroFish unavailable');
      renderMirofishResult(result, data.data || {});
    } catch (e) {
      result.innerHTML = `<div class="cc"><h3 style="color:#ff1744">⚠️ Không kết nối được MiroFish</h3>
        <div style="font-size:12px;color:#607d8b;margin-top:6px">
          ${esc(e.message || e)}<br>
          Backend: chạy <code style="color:#00e676">python backend/run.py</code> trong thư mục MiroFish (cổng 5001),
          hoặc chạy <code style="color:#00e676">npx wrangler dev</code> để bật proxy local.<br>
          Môi trường production sẽ dùng mock data từ _worker.js.
        </div></div>`;
    }
  }

  function renderMirofishResult(result, d) {
    const statusColor = d.impact_color || (d.impact_grade >= 4 ? '#ff1744' : d.impact_grade >= 3 ? '#ff9100' : '#00c853');
    const agents = d.agent_decisions || [];
    const imp = d.impact_analysis || {};

    let agentsHtml = agents.map(a => {
      const prioColor = a.priority === 'Cao' ? '#ff1744' : a.priority === 'Trung bình' ? '#ff9100' : '#00c853';
      const acts = (a.actions || []).map(x => `<div style="padding:4px 0;border-bottom:1px solid #1e2d4a;font-size:11px">• ${esc(x)}</div>`).join('');
      return `
        <div style="background:#131c31;border:1px solid #1e2d4a;border-radius:10px;padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:12px;font-weight:600">${a.icon || '🤖'} ${esc(a.agent_name || a.agent_id)}</div>
            <span style="font-size:10px;color:${prioColor};font-weight:600">${esc(a.priority || '')}</span>
          </div>
          <div style="font-size:11px;color:#b0bec5;margin-bottom:6px">${esc(a.action || '')}</div>
          ${acts}
        </div>`;
    }).join('') || '<div style="color:#607d8b;font-size:12px">Không có quyết định nào</div>';

    const infra = (imp.key_infrastructure || []).map(x => `<span class="tg b" style="font-size:9px;padding:2px 8px;margin:2px">${esc(x)}</span>`).join('');

    result.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="sc"><div class="sl">Trạng thái</div><div class="sv" style="font-size:13px;color:${statusColor}">${esc(d.status || '')}</div></div>
        <div class="sc"><div class="sl">Mức tác động</div><div class="sv" style="font-size:16px;color:${statusColor}">Cấp ${d.impact_grade || 0}</div></div>
        <div class="sc"><div class="sl">Số tác nhân</div><div class="sv" style="font-size:16px">${d.agents_total || agents.length}</div></div>
        <div class="sc"><div class="sl">Engine</div><div class="sv" style="font-size:12px;color:${d.engine === 'llm' ? '#00e676' : '#ff9100'}">${d.engine === 'llm' ? 'LLM' : 'Rule'}</div></div>
      </div>

      <div class="cc" style="margin-bottom:14px"><h3>📊 Phân tích tác động</h3>
        <div style="font-size:12px;color:#b0bec5;margin-top:6px">${esc(imp.summary || '')}</div>
        ${infra ? `<div style="margin-top:8px">Hạ tầng trọng yếu: ${infra}</div>` : ''}
        <div style="margin-top:8px;font-size:11px;color:#607d8b">
          Vùng ảnh hưởng: ${esc(imp.affected_zone || 'Đồng bằng sông Cửu Long')} ·
          Mặn: ${esc(imp.salinity_level || '')} · ${esc(imp.flood_level_name || '')}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        ${agentsHtml}
      </div>

      <div class="cc" style="border-left:3px solid ${statusColor}"><h3>📋 Khuyến nghị tổng hợp</h3>
        <div style="font-size:12px;margin-top:6px;color:#b0bec5">${esc(d.recommendation || '')}</div>
        ${d.llm_summary ? `<div style="font-size:11px;color:#7c4dff;margin-top:8px">✨ LLM: ${esc(d.llm_summary)}</div>` : ''}
        <div style="font-size:9px;color:#607d8b;margin-top:8px">Nguồn: MiroFish Multi-Agent GraphRAG · ${esc(d.timestamp || '')}</div>
      </div>
    `;
  }

  // ============ REGISTER PAGE ============
  function injectMirofishPages() {
    if (typeof PAGES === 'undefined') {
      setTimeout(injectMirofishPages, 500);
      return;
    }
    Object.assign(PAGES, MIROFISH_PAGES);

    if (typeof MENU !== 'undefined' && !MENU.find(m => m.id === 'mirofishSim')) {
      MENU.push({ label: '🧠 Mô phỏng Đa Đại lý', id: 'mirofishSim', icon: '🧠', roles: ['GOD', 'NONG_DAN', 'DOANH_NGHIEP', 'NHA_DAU_TU', 'NGUOI_DAN'] });
    }

    if (typeof MENU_GROUPS !== 'undefined') {
      let aiGroup = MENU_GROUPS.find(g => g.id === 'ai');
      if (!aiGroup) {
        aiGroup = { id: 'ai', label: 'Trí tuệ Nhân tạo & Mô phỏng', icon: '🤖', items: [] };
        MENU_GROUPS.push(aiGroup);
      }
      if (aiGroup.items.indexOf('mirofishSim') < 0) {
        aiGroup.items.push('mirofishSim');
      }
      if (typeof buildSB === 'function') buildSB();
    }

    console.log('[MiroFish UI] Injected mirofishSim page');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMirofishPages);
  } else {
    injectMirofishPages();
  }
})();
