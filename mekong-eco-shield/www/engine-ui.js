/**
 * Mekong Eco-Shield Engine UI — v2.0
 * Extension module that integrates Python engine data into existing PWA.
 * Adds real-time ensemble, GIS, ground truth and alert pages.
 */

(function() {
  const ENGINE_API = '/api/engine';
  let engineData = {};

  // ============ NEW PAGES ============

  const ENGINE_PAGES = {
    'engineEarlyWarning': {
      label: '🚀 Cảnh báo sớm',
      render: function() {
        return `
          <div class="pt">🚀 Hệ thống Cảnh báo Sớm Đa tầng</div>
          <div class="ps">Data Ingestion → Ensemble Consensus → GIS Risk → Ground Truth → Alert Dispatch</div>
          <div id="engineDashboard">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:16px">
              <div class="sc" id="engSatellite"><div class="sl">Vệ tinh</div><div class="sv" style="font-size:14px">Đang tải...</div></div>
              <div class="sc" id="engEnsemble"><div class="sl">Đồng thuận</div><div class="sv" style="font-size:14px">Đang tải...</div></div>
              <div class="sc" id="engGIS"><div class="sl">Ma trận rủi ro</div><div class="sv" style="font-size:14px">Đang tải...</div></div>
              <div class="sc" id="engAlert"><div class="sl">Cảnh báo</div><div class="sv" style="font-size:14px">Đang tải...</div></div>
            </div>
            <div class="cr">
              <div class="cc" id="engEnsembleDetail"><h3>📊 Đồng thuận đa mô hình</h3><div>Đang tải dữ liệu...</div></div>
              <div class="cc" id="engGISDetail"><h3>🗺️ Bản đồ rủi ro không gian</h3><div>Đang tải dữ liệu...</div></div>
            </div>
            <div class="cr">
              <div class="cc" id="engGroundTruth"><h3>🏭 Trạm quan trắc mặt đất</h3><div>Đang tải dữ liệu...</div></div>
              <div class="cc" id="engLongTerm"><h3>📈 Dự báo dài hạn CanSIPS</h3><div>Đang tải dữ liệu...</div></div>
            </div>
            <div class="cc" id="engAlertLog"><h3>🔔 Lịch sử cảnh báo</h3><div>Đang tải dữ liệu...</div></div>
          </div>
          <div style="text-align:center;margin-top:16px">
            <button class="btn bp" onclick="refreshEngineData()">🔄 Làm mới dữ liệu</button>
          </div>
        `;
      },
      init: function() {
        refreshEngineData();
      }
    },

    'engineEnsemble': {
      label: '🎯 Đồng thuận bão',
      render: function() {
        return `
          <div class="pt">🎯 Phân tích Đồng thuận Đa mô hình</div>
          <div class="ps">ECMWF · GFS · GEM — So khớp quỹ đạo & xác suất đổ bộ</div>
          <div id="ensembleView">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
              <div class="sc" id="ensECMWF"><div class="sl">ECMWF (Châu Âu)</div><div class="sv" style="font-size:13px">Đang tải...</div></div>
              <div class="sc" id="ensGFS"><div class="sl">GFS (Mỹ)</div><div class="sv" style="font-size:13px">Đang tải...</div></div>
              <div class="sc" id="ensGEM"><div class="sl">GEM (Canada)</div><div class="sv" style="font-size:13px">Đang tải...</div></div>
            </div>
            <div class="cr">
              <div class="cc"><h3>🔄 Quỹ đạo đồng thuận</h3>
                <table class="dt" id="consensusTable">
                  <tr><th>Giờ</th><th>Vĩ độ</th><th>Kinh độ</th><th>Gió (km/h)</th><th>Áp suất (hPa)</th><th>Cấp</th></tr>
                  <tr><td colspan="6" style="text-align:center;color:#607d8b">Đang tải...</td></tr>
                </table>
              </div>
              <div class="cc"><h3>📊 Chỉ số đồng thuận</h3>
                <div id="consensusMetrics" style="padding:10px 0">
                  <div style="margin-bottom:12px">
                    <div style="font-size:12px;color:#607d8b;margin-bottom:4px">Độ chụm (Spread)</div>
                    <div style="background:#1e2d4a;border-radius:10px;height:20px;overflow:hidden">
                      <div id="spreadBar" style="height:100%;background:linear-gradient(90deg,#00c853,#ff9100,#ff1744);border-radius:10px;width:0%"></div>
                    </div>
                  </div>
                  <div style="margin-bottom:12px">
                    <div style="font-size:12px;color:#607d8b;margin-bottom:4px">Đồng thuận</div>
                    <div style="background:#1e2d4a;border-radius:10px;height:20px;overflow:hidden">
                      <div id="agreementBar" style="height:100%;background:#00c853;border-radius:10px;width:0%"></div>
                    </div>
                  </div>
                  <div style="margin-bottom:12px">
                    <div style="font-size:12px;color:#607d8b;margin-bottom:4px">Xác suất đổ bộ</div>
                    <div style="background:#1e2d4a;border-radius:10px;height:20px;overflow:hidden">
                      <div id="landfallBar" style="height:100%;background:#ff9100;border-radius:10px;width:0%"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="cc"><h3>🌍 Dự báo 240 giờ (14 ngày)</h3>
              <div id="forecastChart" style="height:120px;display:flex;align-items:end;gap:3px;padding:10px 0"></div>
            </div>
          </div>
        `;
      },
      init: function() {
        loadEnsembleData();
      }
    },

    'engineGIS': {
      label: '🗺️ Ma trận rủi ro',
      render: function() {
        return `
          <div class="pt">🗺️ Ma trận Rủi ro Không gian</div>
          <div class="ps">Bản đồ lưới rủi ro — Phân vùng tự động Cấp 1 đến Cấp 6</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <div class="sc"><div class="sl">Tổng số ô lưới</div><div class="sv" id="gisTotalCells">0</div></div>
            <div class="sc"><div class="sl">Điểm nóng (Cấp 5+)</div><div class="sv" id="gisHotspots" style="color:#ff1744">0</div></div>
            <div class="sc"><div class="sl">Cấp rủi ro cao nhất</div><div class="sv" id="gisMaxLevel">0</div></div>
            <div class="sc"><div class="sl">Diện tích ảnh hưởng</div><div class="sv" id="gisArea">0 km²</div></div>
          </div>
          <div class="cr">
            <div class="cc"><h3>🔥 Điểm nóng rủi ro</h3>
              <div id="hotspotList"><div style="color:#607d8b;font-size:12px">Đang tải...</div></div>
            </div>
            <div class="cc"><h3>🏛️ Rủi ro theo tỉnh</h3>
              <div id="provinceRiskList"><div style="color:#607d8b;font-size:12px">Đang tải...</div></div>
            </div>
          </div>
          <div class="cc"><h3>🗺️ Bản đồ nhiệt rủi ro</h3>
            <div id="riskHeatmap" style="width:100%;height:200px;background:#0b1120;border-radius:8px;overflow:hidden;position:relative"></div>
          </div>
        `;
      },
      init: function() {
        loadGISData();
      }
    },

    'engineGroundTruth': {
      label: '🏭 Trạm quan trắc',
      render: function() {
        return `
          <div class="pt">🏭 Trạm Quan trắc Mặt đất</div>
          <div class="ps">Đối chiếu dữ liệu vệ tinh với trạm thủy văn — Lọc nhiễu, chống báo động giả</div>
          <div id="stationGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px"></div>
          <div class="cc"><h3>📊 Tổng hợp kiểm chứng</h3>
            <div id="validationSummary" style="font-size:12px;color:#607d8b">Đang tải...</div>
          </div>
        `;
      },
      init: function() {
        loadGroundTruthData();
      }
    },

    'engineLongTerm': {
      label: '📈 Dự báo mùa vụ',
      render: function() {
        return `
          <div class="pt">📈 Dự báo Khí hậu Dài hạn</div>
          <div class="ps">CanSIPS · CFSv2 — Bất thường nhiệt độ & lượng mưa (tháng 8/2026)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <div class="sc"><div class="sl">🌧️ Mưa TB</div><div class="sv" id="ltPrecipAvg" style="font-size:16px">0 mm</div></div>
            <div class="sc"><div class="sl">🌡️ Nhiệt TB</div><div class="sv" id="ltTempAvg" style="font-size:16px">0 °C</div></div>
            <div class="sc"><div class="sl">⚠️ Cấp rủi ro</div><div class="sv" id="ltRiskLevel" style="font-size:16px">0</div></div>
            <div class="sc"><div class="sl">📊 Độ tin cậy</div><div class="sv" id="ltConfidence" style="font-size:16px">0%</div></div>
          </div>
          <div class="cr">
            <div class="cc"><h3>🌧️ Vùng nguy cơ lũ lụt</h3><div id="ltFloodZones">Đang tải...</div></div>
            <div class="cc"><h3>🌡️ Vùng nguy cơ nắng nóng</h3><div id="ltHeatZones">Đang tải...</div></div>
          </div>
          <div class="cc"><h3>📋 Khuyến nghị</h3><div id="ltRecommendation" style="font-size:12px">Đang tải...</div></div>
        `;
      },
      init: function() {
        loadLongTermData();
      }
    }
  };

  // ============ DATA LOADING ============

  window.refreshEngineData = function() {
    loadEngineDashboard();
  };

  async function loadEngineDashboard() {
    try {
      const resp = await fetch(`${ENGINE_API}/assessment/full`);
      const data = await resp.json();
      if (!data.ok) throw new Error('Engine unavailable');

      engineData = data;

      // Update summary cards
      const sat = document.getElementById('engSatellite');
      if (sat) {
        const detected = data.satellite?.storm_detected;
        sat.innerHTML = `<div class="sl">Vệ tinh Himawari-9</div>
          <div class="sv" style="font-size:13px">${detected ? '🟢 Bão phát hiện' : '🔵 Bình thường'}</div>
          <div style="font-size:10px;color:#607d8b">Đỉnh mây: ${data.satellite?.cloud_top_temp || 'N/A'}°C</div>`;
      }

      const ens = document.getElementById('engEnsemble');
      if (ens) {
        const em = data.ensemble;
        ens.innerHTML = `<div class="sl">Đồng thuận đa mô hình</div>
          <div class="sv" style="font-size:13px">${em?.agreement_pct || 0}%</div>
          <div style="font-size:10px;color:#607d8b">Cấp: ${em?.recommended_level || 0}/6</div>`;
      }

      const gis = document.getElementById('engGIS');
      if (gis) {
        const gm = data.gis;
        gis.innerHTML = `<div class="sl">Ma trận rủi ro</div>
          <div class="sv" style="font-size:13px">${gm?.hotspots || 0} điểm nóng</div>
          <div style="font-size:10px;color:#607d8b">${gm?.total_cells || 0} ô lưới</div>`;
      }

      const alt = document.getElementById('engAlert');
      if (alt) {
        const al = data.alert;
        alt.innerHTML = `<div class="sl">Trạng thái cảnh báo</div>
          <div class="sv" style="font-size:13px;color:${al ? '#ff1744' : '#00c853'}">${al ? '🚨 ĐÃ KÍCH HOẠT' : '✅ BÌNH THƯỜNG'}</div>
          <div style="font-size:10px;color:#607d8b">${al ? al.channels?.join(', ') : 'Không có cảnh báo'}</div>`;
      }

      // Ensemble detail
      const ensDet = document.getElementById('engEnsembleDetail');
      if (ensDet && data.ensemble) {
        const e = data.ensemble;
        ensDet.innerHTML = `
          <h3>📊 Đồng thuận đa mô hình</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
            <div style="background:#18243c;border-radius:8px;padding:10px">
              <div style="font-size:10px;color:#607d8b">Độ đồng thuận</div>
              <div style="font-size:24px;font-weight:700;color:#00c853">${e.agreement_pct}%</div>
            </div>
            <div style="background:#18243c;border-radius:8px;padding:10px">
              <div style="font-size:10px;color:#607d8b">Độ chụm</div>
              <div style="font-size:24px;font-weight:700;color:#ff9100">${e.spread_km}km</div>
            </div>
            <div style="background:#18243c;border-radius:8px;padding:10px">
              <div style="font-size:10px;color:#607d8b">Xác suất đổ bộ</div>
              <div style="font-size:24px;font-weight:700;color:#ff9100">${e.landfall_probability}%</div>
            </div>
            <div style="background:#18243c;border-radius:8px;padding:10px">
              <div style="font-size:10px;color:#607d8b">Cấp khuyến nghị</div>
              <div style="font-size:24px;font-weight:700;color:${e.recommended_level >= 4 ? '#ff1744' : '#00c853'}">${e.recommended_level}/6</div>
            </div>
          </div>`;
      }

      // GIS detail
      const gisDet = document.getElementById('engGISDetail');
      if (gisDet && data.gis) {
        const g = data.gis;
        const provList = Object.entries(g.province_risk || {}).slice(0, 6).map(([p, v]) =>
          `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e2d4a">
            <span>${p}</span><span style="color:${v.max_level >= 4 ? '#ff1744' : '#ff9100'}">Cấp ${v.max_level} (${v.hotspots} điểm nóng)</span>
          </div>`
        ).join('') || '<div style="color:#607d8b">Không có dữ liệu</div>';
        gisDet.innerHTML = `
          <h3>🗺️ Bản đồ rủi ro không gian</h3>
          <div style="margin-top:8px">
            <div style="display:flex;justify-content:space-between;padding:6px 0;color:#607d8b;font-size:11px">
              <span>${g.total_cells} ô lưới · ${g.hotspots} điểm nóng</span>
              <span>${g.affected_area_km2} km² ảnh hưởng</span>
            </div>
            ${provList}
          </div>`;
      }

      // Ground truth
      const gt = document.getElementById('engGroundTruth');
      if (gt && data.ground_truth) {
        gt.innerHTML = `
          <h3>🏭 Trạm quan trắc mặt đất</h3>
          <div style="font-size:12px;color:#00c853;margin-top:8px">✅ ${data.ground_truth.validated} trạm đã kiểm chứng</div>
          <div style="font-size:12px;color:#607d8b;margin-top:4px">Bộ lọc Ground Truth: ${data.ground_truth.stations_validated} trạm khớp</div>
          <div style="margin-top:8px">
            <button class="btn bp" style="font-size:10px;padding:4px 10px" onclick="loadPage('engineGroundTruth')">Xem chi tiết →</button>
          </div>`;
      }

      // Long term
      const lt = document.getElementById('engLongTerm');
      if (lt) {
        try {
          const ltResp = await fetch(`${ENGINE_API}/forecast/long-term?month=8`);
          const ltData = await ltResp.json();
          if (ltData.ok) {
            lt.innerHTML = `
              <h3>📈 Dự báo dài hạn CanSIPS</h3>
              <div style="margin-top:8px;font-size:12px">
                <div>🌧️ Mưa: ${ltData.anomalies?.precipitation?.avg_mm || 'N/A'}mm (${ltData.anomalies?.precipitation?.interpretation || ''})</div>
                <div>🌡️ Nhiệt: ${ltData.anomalies?.temperature?.avg_c || 'N/A'}°C (${ltData.anomalies?.temperature?.interpretation || ''})</div>
                <div style="margin-top:8px;color:#607d8b">Độ tin cậy: ${ltData.confidence_avg || 0}%</div>
              </div>`;
          }
        } catch(e) {
          lt.innerHTML = `<h3>📈 Dự báo dài hạn</h3><div style="color:#ff1744;font-size:12px">Không thể tải dữ liệu CanSIPS</div>`;
        }
      }

      // Alert log
      const alLog = document.getElementById('engAlertLog');
      if (alLog) {
        try {
          const alResp = await fetch(`${ENGINE_API}/alerts/history`);
          const alData = await alResp.json();
          const alerts = alData.alerts || [];
          alLog.innerHTML = `
            <h3>🔔 Lịch sử cảnh báo</h3>
            ${alerts.length === 0 ? '<div style="color:#607d8b;font-size:12px;margin-top:8px">Chưa có cảnh báo nào</div>' :
              alerts.map(a => `
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e2d4a;font-size:12px">
                  <span style="color:${a.level >= 5 ? '#ff1744' : a.level >= 3 ? '#ff9100' : '#00c853'}">${'⚠️'.repeat(Math.min(a.level, 3))} ${a.title}</span>
                  <span style="color:#607d8b">${new Date(a.timestamp).toLocaleString('vi-VN')}</span>
                  <span style="color:${a.status === 'active' ? '#ff1744' : '#607d8b'}">${a.status === 'active' ? '🔴 Hoạt động' : '✅ Hoàn tất'}</span>
                </div>
              `).join('')
            }`;
        } catch(e) {
          alLog.innerHTML = `<h3>🔔 Lịch sử cảnh báo</h3><div style="color:#607d8b;font-size:12px">Không thể tải</div>`;
        }
      }
    } catch (e) {
      console.error('Engine dashboard error:', e);
      document.querySelectorAll('#engSatellite, #engEnsemble, #engGIS, #engAlert').forEach(el => {
        if (el) el.innerHTML = `<div class="sl">Lỗi</div><div class="sv" style="font-size:12px;color:#ff1744">⚠️ Không thể kết nối</div>`;
      });
    }
  }

  async function loadEnsembleData() {
    try {
      const resp = await fetch(`${ENGINE_API}/ensemble/consensus`);
      const data = await resp.json();
      if (!data.ok) throw new Error('No data');

      // Model cards
      const models = data.members || [];
      const modelMap = { ensECMWF: null, ensGFS: null, ensGEM: null };
      models.forEach(m => {
        const key = 'ens' + m.model.toUpperCase();
        const el = document.getElementById(key);
        if (el) {
          const color = m.model === 'ECMWF' ? '#2196f3' : m.model === 'GFS' ? '#f44336' : '#ffeb3b';
          el.innerHTML = `
            <div class="sl">${m.model}</div>
            <div class="sv" style="font-size:13px;color:${color}">${m.max_wind} km/h</div>
            <div style="font-size:10px;color:#607d8b">Áp suất: ${m.min_pressure} hPa · Tin cậy: ${m.confidence}%</div>`;
        }
      });

      // Consensus table
      const table = document.getElementById('consensusTable');
      if (table && data.consensus) {
        const rows = data.consensus.map(pt => `
          <tr>
            <td>${pt.hour}h</td>
            <td>${pt.lat}°N</td>
            <td>${pt.lon}°E</td>
            <td>${pt.wind_speed}</td>
            <td>${pt.pressure}</td>
            <td><span class="tg ${pt.category >= 3 ? 'r' : pt.category >= 1 ? 'o' : 'g'}">Cấp ${pt.category}</span></td>
          </tr>
        `).join('');
        table.innerHTML = `<tr><th>Giờ</th><th>Vĩ độ</th><th>Kinh độ</th><th>Gió (km/h)</th><th>Áp suất (hPa)</th><th>Cấp</th></tr>${rows}`;
      }

      // Metrics bars
      const em = data.ensemble_metrics || {};
      const spreadBar = document.getElementById('spreadBar');
      if (spreadBar) spreadBar.style.width = Math.min(100, em.spread_km / 2) + '%';
      const agreementBar = document.getElementById('agreementBar');
      if (agreementBar) agreementBar.style.width = (em.agreement_pct || 0) + '%';
      const landfallBar = document.getElementById('landfallBar');
      if (landfallBar) landfallBar.style.width = (em.landfall_probability || 0) + '%';

      // Forecast chart
      const chart = document.getElementById('forecastChart');
      if (chart && data.consensus) {
        const maxPress = Math.max(...data.consensus.map(p => p.pressure));
        const minPress = Math.min(...data.consensus.map(p => p.pressure));
        chart.innerHTML = data.consensus.map((pt, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%">
            <div style="flex:1;display:flex;align-items:end;width:100%">
              <div class="bar" style="height:${((pt.pressure - minPress) / (maxPress - minPress)) * 100}%;background:linear-gradient(180deg,#ff1744,#ff9100,#00c853);width:100%;opacity:${1 - i * 0.08}"></div>
            </div>
            <div style="font-size:7px;color:#607d8b;margin-top:2px">${pt.hour}h</div>
          </div>
        `).join('');
      }
    } catch(e) {
      console.error('Ensemble load error:', e);
    }
  }

  async function loadGISData() {
    try {
      const resp = await fetch(`${ENGINE_API}/gis/risk-matrix`);
      const data = await resp.json();
      if (!data.ok) throw new Error('No data');

      document.getElementById('gisTotalCells').textContent = data.total_cells || 0;
      document.getElementById('gisHotspots').textContent = data.hotspots || 0;
      document.getElementById('gisMaxLevel').textContent = data.total_level || 0;
      document.getElementById('gisArea').textContent = (data.affected_area_km2 || 0).toLocaleString() + ' km²';

      // Hotspot list
      const hsList = document.getElementById('hotspotList');
      if (hsList) {
        const hots = data.hotspot_coords || [];
        hsList.innerHTML = hots.length === 0 ? '<div style="color:#00c853;font-size:12px">✅ Không có điểm nóng</div>' :
          hots.map(h => `
            <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e2d4a;font-size:11px">
              <span style="color:#ff1744">🔴 ${h.province}</span>
              <span style="color:#607d8b">${h.lat}°N, ${h.lon}°E</span>
            </div>
          `).join('');
      }

      // Province risk
      const prList = document.getElementById('provinceRiskList');
      if (prList) {
        const pr = data.province_risk || {};
        const entries = Object.entries(pr).sort((a, b) => b[1].max_level - a[1].max_level);
        prList.innerHTML = entries.length === 0 ? '<div style="color:#607d8b;font-size:12px">Không có dữ liệu</div>' :
          entries.map(([p, v]) => `
            <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e2d4a;font-size:11px">
              <span>${p}</span>
              <span>
                <span style="color:${v.max_level >= 4 ? '#ff1744' : v.max_level >= 3 ? '#ff9100' : '#00c853'}">Cấp ${v.max_level}</span>
                <span style="color:#607d8b;margin-left:6px">${v.hotspots} điểm nóng</span>
              </span>
            </div>
          `).join('');
      }

      // Heatmap
      const heatmap = document.getElementById('riskHeatmap');
      if (heatmap && data.cells) {
        const cells = data.cells.slice(0, 500);
        const cellSize = Math.max(2, Math.floor(Math.min(heatmap.offsetWidth, heatmap.offsetHeight) / Math.sqrt(cells.length)));
        const colors = { 1: '#1a237e', 2: '#0d47a1', 3: '#ff9100', 4: '#ff6d00', 5: '#ff1744', 6: '#b71c1c' };
        heatmap.innerHTML = cells.map(c =>
          `<div style="position:absolute;left:${((c.lon - 104) / 3) * 100}%;top:${((c.lat - 8.5) / 3) * 100}%;width:${cellSize}px;height:${cellSize}px;background:${colors[c.level] || '#1a237e'};opacity:${0.3 + c.level * 0.12};border-radius:1px" title="${c.province}: Cấp ${c.level}"></div>`
        ).join('');
      }
    } catch(e) {
      console.error('GIS load error:', e);
    }
  }

  async function loadGroundTruthData() {
    try {
      const resp = await fetch(`${ENGINE_API}/ground-truth/stations`);
      const data = await resp.json();
      if (!data.ok) throw new Error('No data');

      const grid = document.getElementById('stationGrid');
      if (grid && data.stations) {
        grid.innerHTML = data.stations.map(s => `
          <div style="background:#131c31;border:1px solid #1e2d4a;border-radius:8px;padding:10px">
            <div style="display:flex;justify-content:space-between">
              <span style="font-weight:600;font-size:12px">${s.name}</span>
              <span style="font-size:10px;color:${s.status === 'online' ? '#00c853' : '#ff1744'}">${s.status === 'online' ? '🟢 Online' : '🔴 Offline'}</span>
            </div>
            <div style="font-size:10px;color:#607d8b;margin:4px 0">${s.province} · ${s.river}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:6px;font-size:11px">
              <div><span style="color:#607d8b">Mực nước:</span> ${s.water_level}m</div>
              <div><span style="color:#607d8b">Mưa 24h:</span> ${s.rain_24h}mm</div>
              <div><span style="color:#607d8b">Gió:</span> ${s.wind_speed}km/h</div>
            </div>
          </div>
        `).join('');
      }

      const summary = document.getElementById('validationSummary');
      if (summary) {
        summary.innerHTML = `
          <div style="margin-top:8px">
            <div style="color:#00c853">✅ ${data.stations?.length || 0} trạm quan trắc đang hoạt động</div>
            <div style="color:#607d8b;margin-top:4px">
              Dữ liệu được đối chiếu chéo giữa vệ tinh Himawari-9, mô hình NWP và trạm mặt đất.
              Hệ thống tự động lọc nhiễu nếu độ lệch > 3 cấp để tránh báo động giả.
            </div>
          </div>`;
      }
    } catch(e) {
      console.error('Ground truth load error:', e);
    }
  }

  async function loadLongTermData() {
    try {
      const resp = await fetch(`${ENGINE_API}/forecast/long-term?month=8`);
      const data = await resp.json();
      if (!data.ok) throw new Error('No data');

      document.getElementById('ltPrecipAvg').textContent = (data.anomalies?.precipitation?.avg_mm || 0) + 'mm';
      document.getElementById('ltTempAvg').textContent = (data.anomalies?.temperature?.avg_c || 0) + '°C';
      document.getElementById('ltRiskLevel').textContent = data.overall_risk_level + '/5';
      document.getElementById('ltRiskLevel').style.color = data.overall_risk_level >= 4 ? '#ff1744' : '#ff9100';
      document.getElementById('ltConfidence').textContent = (data.confidence_avg || 0) + '%';

      const floodDiv = document.getElementById('ltFloodZones');
      if (floodDiv) {
        const zones = data.risk_zones?.flood || [];
        floodDiv.innerHTML = zones.length === 0 ? '<div style="color:#00c853;font-size:12px">✅ Không phát hiện</div>' :
          zones.map(z => `<div style="padding:4px 0;border-bottom:1px solid #1e2d4a;font-size:11px">🌧️ ${z.province}: +${z.anomaly_mm}mm</div>`).join('');
      }

      const heatDiv = document.getElementById('ltHeatZones');
      if (heatDiv) {
        const zones = data.risk_zones?.heatwave || [];
        heatDiv.innerHTML = zones.length === 0 ? '<div style="color:#00c853;font-size:12px">✅ Không phát hiện</div>' :
          zones.map(z => `<div style="padding:4px 0;border-bottom:1px solid #1e2d4a;font-size:11px">🌡️ ${z.province}: +${z.anomaly_c}°C</div>`).join('');
      }

      const recDiv = document.getElementById('ltRecommendation');
      if (recDiv) recDiv.innerHTML = `<div style="margin-top:8px;padding:10px;background:#18243c;border-radius:8px;font-size:12px">${data.recommendation || 'Không có khuyến nghị'}</div>`;
    } catch(e) {
      console.error('Long term load error:', e);
    }
  }

  // ============ REGISTER NEW PAGES ============

  // Wait for the app to be ready, then inject new pages
  function injectEnginePages() {
    if (typeof PAGES === 'undefined') {
      setTimeout(injectEnginePages, 500);
      return;
    }

    // Add new pages to PAGES object
    Object.assign(PAGES, ENGINE_PAGES);

    // Add menu items to the MENU_GROUPS
    if (typeof MENU_GROUPS !== 'undefined') {
      // Find or create an "Engine" menu group
      let engineGroup = MENU_GROUPS.find(g => g.id === 'engine');
      if (!engineGroup) {
        const dashboardIdx = MENU_GROUPS.findIndex(g => g.id === 'dashboard');
        engineGroup = {
          id: 'engine',
          label: '🤖 CẢNH BÁO SỚM AI',
          icon: '🤖',
          items: [
            { id: 'engineEarlyWarning', label: '🚀 Tổng quan', icon: '🚀', pin: true },
            { id: 'engineEnsemble', label: '🎯 Đồng thuận bão', icon: '🎯' },
            { id: 'engineGIS', label: '🗺️ Ma trận rủi ro', icon: '🗺️' },
            { id: 'engineGroundTruth', label: '🏭 Trạm quan trắc', icon: '🏭' },
            { id: 'engineLongTerm', label: '📈 Dự báo mùa vụ', icon: '📈' }
          ]
        };
        if (dashboardIdx >= 0) {
          MENU_GROUPS.splice(dashboardIdx + 1, 0, engineGroup);
        } else {
          MENU_GROUPS.push(engineGroup);
        }
      }

      // Rebuild sidebar if buildSB exists
      if (typeof buildSB === 'function') {
        buildSB();
      }
    }

    console.log('[Engine UI] Injected 5 new AI engine pages');
  }

  // Start injection when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectEnginePages);
  } else {
    injectEnginePages();
  }
})();
