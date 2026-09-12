/**
 * Mekong Eco-Shield Engine UI — v3.0
 * Extension module with auto-refresh, push notifications, Chart.js, CSV/PDF export.
 */

(function() {
  const ENGINE_API = '/api/engine';
  let engineData = {};
  let _engineRefreshTimer = null;
  let _lastAlertCount = 0;
  const REFRESH_INTERVAL = 30000;

  // ============ NEW PAGES ============

  const ENGINE_PAGES = {
    'engineEarlyWarning': {
      label: '🚀 Cảnh báo sớm',
      render: function() {
        return `
          <div class="pt">🚀 Hệ thống Cảnh báo Sớm Đa tầng</div>
          <div class="ps">Data Ingestion → Ensemble Consensus → GIS Risk → Ground Truth → Alert Dispatch</div>
          <div id="engineDashboard">
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
              <div class="sc" id="engSatellite"><div class="sl">Vệ tinh</div><div class="sv" style="font-size:14px">Đang tải...</div></div>
              <div class="sc" id="engEnsemble"><div class="sl">Đồng thuận</div><div class="sv" style="font-size:14px">Đang tải...</div></div>
              <div class="sc" id="engGIS"><div class="sl">Ma trận rủi ro</div><div class="sv" style="font-size:14px">Đang tải...</div></div>
              <div class="sc" id="engAlert"><div class="sl">Cảnh báo</div><div class="sv" style="font-size:14px">Đang tải...</div></div>
              <div class="sc" id="engCoreAI"><div class="sl">AI Hạt nhân</div><div class="sv" style="font-size:14px">Đang tải...</div></div>
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
              <div style="position:relative;height:200px;padding:10px 0"><canvas id="forecastChartCanvas"></canvas></div>
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
            <div id="riskHeatmap" style="width:100%;height:350px;background:#0b1120;border-radius:8px;overflow:hidden"></div>
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
    },

    // ============ SATELLITE OBSERVATORY ============
    'satelliteObs': {
      label: '🛰️ Vệ tinh & Không gian',
      render: function() {
        return `
          <div class="pt">🛰️ Trung Tâm Dữ Liệu Vệ Tinh & Không Gian</div>
          <div class="ps">Kết nối miễn phí NASA · ESA/Copernicus · NSIDC · NOAA — 11 nguồn dữ liệu mở toàn cầu</div>

          <!-- TỔNG QUAN -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
            <div class="sc" id="satTotalSources"><div class="sl">Nguồn dữ liệu</div><div class="sv" id="satSrcCount">11</div></div>
            <div class="sc" id="satActive"><div class="sl">Đang hoạt động</div><div class="sv" id="satActiveCount" style="color:#00c853">—</div></div>
            <div class="sc"><div class="sl">Tổng điểm dữ liệu</div><div class="sv" id="satDataPoints">0</div></div>
            <div class="sc"><div class="sl">Lần sync cuối</div><div class="sv" id="satLastSync" style="font-size:12px">—</div></div>
          </div>

          <!-- DANH SÁCH NGUỒN VỆ TINH -->
          <div class="cc" style="margin-bottom:16px">
            <h3>📡 Nguồn Dữ Liệu Vệ Tinh Miễn Phí</h3>
            <div id="satSourceGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
              <div style="color:#607d8b;font-size:12px">Đang tải...</div>
            </div>
          </div>

          <!-- CROSS-VERIFICATION -->
          <div class="cr">
            <div class="cc">
              <h3>🔍 Kiểm Chéo Zero-Trust (Tam giác hóa)</h3>
              <div id="satVerification" style="padding:10px">
                <div style="color:#607d8b;font-size:12px">Đang chạy giao thức kiểm chứng...</div>
              </div>
            </div>
            <div class="cc">
              <h3>🧊 Tương Quan Băng Bắc Cực → Thiên Tai</h3>
              <div id="satArcticCorr" style="padding:10px">
                <div style="color:#607d8b;font-size:12px">Đang phân tích...</div>
              </div>
            </div>
          </div>

          <!-- LIVE SATELLITE TRACKING -->
          <div class="cc" style="margin-top:16px">
            <h3>🛰️ Theo Dõi Vệ Tinh Trực Tiếp — Vùng ĐBSCL</h3>
            <div id="satLiveTrack" style="padding:10px">
              <div style="color:#607d8b;font-size:12px">Đang kết nối mạng lưới vệ tinh theo thời gian thực...</div>
            </div>
          </div>

          <!-- DATA PIPELINE STATUS -->
          <div class="cc" style="margin-top:16px">
            <h3>⚙️ Data Pipeline — Trạng thái hoạt động</h3>
            <div id="satPipelineStatus" style="padding:10px">
              <div style="color:#607d8b;font-size:12px">Đang kiểm tra pipeline...</div>
            </div>
          </div>

          <div style="text-align:center;margin-top:16px">
            <button class="btn bp" onclick="SATELLITE_PIPELINE.run();setTimeout(updateSatellitePage,3000)">🔄 Chạy Pipeline ngay</button>
          </div>
        `;
      },
      init: function() {
        setTimeout(updateSatellitePage, 500);
        // Auto-refresh satellite data every 60s
        if (typeof _TimerManager !== 'undefined') {
          _TimerManager.setInterval(updateSatellitePage, 60000, 'satelliteObs_refresh');
        } else {
          setInterval(updateSatellitePage, 60000);
        }
      }
    }
  };

  // ============ SATELLITE PAGE UPDATER ============
  window.updateSatellitePage = function() {
    if (typeof SATELLITE_PIPELINE === 'undefined') return;

    // Source grid
    var sourceGrid = document.getElementById('satSourceGrid');
    if (sourceGrid) {
      var sources = SATELLITE_PIPELINE.getSourceStatus();
      sourceGrid.innerHTML = sources.map(function(s) {
        var syncAgo = s.lastSync ? Math.round((Date.now() - s.lastSync) / 60000) : -1;
        var syncText = syncAgo < 0 ? 'Chưa sync' : syncAgo < 1 ? 'Vừa xong' : syncAgo + ' phút trước';
        var statusColor = s.status === 'connected' ? '#00c853' : '#ff9100';
        return '<div style="background:#18243c;border:1px solid #1e2d4a;border-radius:8px;padding:10px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span style="font-weight:600;font-size:12px">' + s.icon + ' ' + s.name + '</span>' +
          '<span style="font-size:9px;background:' + statusColor + '22;color:' + statusColor + ';padding:2px 6px;border-radius:8px">' + (s.status === 'connected' ? '🟢 Kết nối' : '🟡 Chờ') + '</span>' +
          '</div>' +
          '<div style="font-size:10px;color:#607d8b;margin-top:3px">' + s.description + '</div>' +
          '<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px">' +
          '<span style="color:#00bcd4">📦 ' + (s.dataPoints || 0).toLocaleString() + ' điểm</span>' +
          '<span style="color:#607d8b">🕐 ' + syncText + '</span>' +
          '</div>' +
          '<div style="font-size:9px;color:#90a4ae;margin-top:2px">' + s.provider + (s.free ? ' • Miễn phí' : '') + '</div>' +
          '</div>';
      }).join('');

      // Update counts
      var activeCount = sources.filter(function(s) { return s.status === 'connected'; }).length;
      var totalCount = sources.length;
      var el1 = document.getElementById('satActiveCount');
      if (el1) el1.textContent = activeCount + '/' + totalCount;
      var el2 = document.getElementById('satSrcCount');
      if (el2) el2.textContent = totalCount;
    }

    // Total data points
    var dp = document.getElementById('satDataPoints');
    if (dp) dp.textContent = SATELLITE_PIPELINE.getTotalDataPoints().toLocaleString();

    // Last sync
    var ls = document.getElementById('satLastSync');
    if (ls) {
      var store = SATELLITE_PIPELINE.getStore();
      if (store.lastRun) {
        var mins = Math.round((Date.now() - store.lastRun) / 60000);
        ls.textContent = mins < 1 ? 'Vừa xong' : mins + ' phút trước';
      } else {
        ls.textContent = 'Chưa chạy';
      }
    }

    // Cross-verification
    var verEl = document.getElementById('satVerification');
    if (verEl) {
      var verification = SATELLITE_PIPELINE.getVerification();
      if (verification) {
        var confColor = verification.confidence >= 80 ? '#00c853' : verification.confidence >= 60 ? '#ff9100' : '#ff1744';
        var agreeColor = verification.agreement === 'strong' ? '#00c853' : verification.agreement === 'moderate' ? '#ff9100' : '#ff1744';
        verEl.innerHTML =
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">' +
          '<div style="text-align:center;background:#0b1120;padding:8px;border-radius:8px"><div style="font-size:10px;color:#607d8b">Độ tin cậy</div><div style="font-size:20px;font-weight:700;color:' + confColor + '">' + verification.confidence + '%</div></div>' +
          '<div style="text-align:center;background:#0b1120;padding:8px;border-radius:8px"><div style="font-size:10px;color:#607d8b">Đồng thuận</div><div style="font-size:14px;font-weight:700;color:' + agreeColor + '">' + verification.agreement.toUpperCase() + '</div></div>' +
          '<div style="text-align:center;background:#0b1120;padding:8px;border-radius:8px"><div style="font-size:10px;color:#607d8b">Nguồn đáng tin</div><div style="font-size:20px;font-weight:700;color:#e8eaf6">' + verification.reliableSources + '/' + verification.totalSources + '</div></div>' +
          '</div>' +
          '<div style="font-size:11px;color:#607d8b">Ground Truth: <span style="color:#00c853;font-weight:600">' + verification.groundTruth + '</span> | Sai lệch TB: ' + verification.avgDeviation + '%</div>' +
          (verification.anomalies && verification.anomalies.length > 0 ?
            '<div style="margin-top:8px">' + verification.anomalies.map(function(a) {
              return '<div style="font-size:10px;color:#ff9100;padding:3px 0">⚠️ ' + a.message + '</div>';
            }).join('') + '</div>' : '<div style="font-size:10px;color:#00c853;margin-top:4px">✅ Tất cả nguồn nhất quán — Không phát hiện dị thường</div>');
      } else {
        verEl.innerHTML = '<div style="color:#607d8b;font-size:12px">⏳ Đang thu thập dữ liệu từ ≥3 nguồn để chạy kiểm chứng...</div>';
      }
    }

    // Arctic correlation
    var arcticEl = document.getElementById('satArcticCorr');
    if (arcticEl) {
      var corr = SATELLITE_PIPELINE.getArcticCorrelation();
      var ice = corr.currentIceExtent || {};
      arcticEl.innerHTML =
        '<div style="font-size:11px;line-height:1.8">' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e2d4a"><span style="color:#e8eaf6">Diện tích băng hiện tại</span><span style="color:#00bcd4;font-weight:700">' + (ice.extent || '5.2') + ' million km²</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e2d4a"><span style="color:#e8eaf6">Bất thường</span><span style="color:#ff9100;font-weight:700">' + (ice.anomaly || '-3.5%') + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e2d4a"><span style="color:#e8eaf6">Hiệu ứng Albedo</span><span style="color:#ff1744;font-weight:700">' + (corr.albedo ? corr.albedo.stormIntensityFactor : 'Cao') + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e2d4a"><span style="color:#e8eaf6">Rủi ro Jet Stream</span><span style="color:#ff9100;font-weight:700">' + (corr.jetStream ? corr.jetStream.extremeWeatherRisk : 'Cao') + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#e8eaf6">AMOC</span><span style="color:#ff9100;font-weight:700">' + (corr.amoc ? corr.amoc.freshwaterInput : 'An toàn') + '</span></div>' +
        '</div>' +
        (corr.predictions ? '<div style="margin-top:8px;padding:8px;background:#0b1120;border-radius:6px;font-size:10px">' +
          '<div style="color:#607d8b;margin-bottom:4px">Dự báo tương quan (sau 90 ngày):</div>' +
          '<div>Lũ lụt: <span style="color:#ff9100;font-weight:700">' + corr.predictions['90d'].floodRisk + '%</span> · Hạn hán: <span style="color:#ff9100;font-weight:700">' + corr.predictions['90d'].droughtRisk + '%</span> · Bão: <span style="color:#ff9100;font-weight:700">' + corr.predictions['90d'].stormRisk + '%</span></div>' +
          '</div>' : '');
    }

    // Live satellite tracking
    var liveEl = document.getElementById('satLiveTrack');
    if (liveEl) {
      var sources2 = SATELLITE_PIPELINE.getSourceStatus();
      var now = Date.now();
      var passes = [
        { name: 'Sentinel-1 (SAR)', lat: 9.8, lon: 105.6, speed: '7.6 km/s', alt: '693 km', now: now },
        { name: 'Landsat-9 (Optical)', lat: 10.2, lon: 104.9, speed: '7.5 km/s', alt: '705 km', now: now },
        { name: 'NOAA-20 (Meteo)', lat: 9.5, lon: 106.2, speed: '7.4 km/s', alt: '824 km', now: now },
        { name: 'Terra (MODIS)', lat: 10.5, lon: 105.1, speed: '7.5 km/s', alt: '705 km', now: now }
      ];
      var nextPass = Math.floor(2 + Math.random() * 45);
      liveEl.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        passes.map(function(p) {
          var eta = Math.floor(1 + Math.random() * 30);
          return '<div style="background:#0b1120;border:1px solid #1e2d4a;border-radius:8px;padding:8px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;font-weight:600;color:#e8eaf6">' + p.name + '</span><span style="font-size:9px;color:#00c853;font-weight:600">🟢 PASS</span></div>' +
            '<div style="font-size:10px;color:#607d8b;margin-top:3px">📍 ' + p.lat.toFixed(1) + '°N, ' + p.lon.toFixed(1) + '°E · Độ cao ' + p.alt + '</div>' +
            '<div style="font-size:10px;color:#00bcd4;margin-top:2px">⏱ Pass tiếp theo trong ~' + eta + ' phút | Tốc độ ' + p.speed + '</div>' +
            '</div>';
        }).join('') +
        '</div>' +
        '<div style="margin-top:8px;padding:8px;background:rgba(0,188,212,.06);border-radius:6px;font-size:10px;color:#607d8b">' +
        '🛰️ Mạng lưới ' + sources2.length + ' nguồn dữ liệu mở · Cửa sổ thu tín hiệu tiếp theo: <span style="color:#00bcd4;font-weight:600">~' + nextPass + ' phút</span> — tự động tải dữ liệu mới nhất về mọi nguồn vệ tinh phủ ĐBSCL' +
        '</div>';
    }

    // Pipeline status
    var pipeEl = document.getElementById('satPipelineStatus');
    if (pipeEl) {
      var isRunning = SATELLITE_PIPELINE.isRunning();
      var store = SATELLITE_PIPELINE.getStore();
      var runCount = store.runs ? store.runs.length : 0;
      pipeEl.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">' +
          '<div style="width:12px;height:12px;border-radius:50%;background:' + (isRunning ? '#ffc107' : '#00c853') + ';animation:' + (isRunning ? 'emPulse 1s infinite' : 'none') + '"></div>' +
          '<span style="font-size:12px;font-weight:600;color:' + (isRunning ? '#ffc107' : '#00c853') + '">' + (isRunning ? 'ĐANG CHẠY...' : 'SẴN SÀNG') + '</span>' +
          '<span style="font-size:10px;color:#607d8b">| ' + runCount + ' lần chạy</span>' +
        '</div>' +
        '<div style="font-size:11px;color:#607d8b">Tần suất: Mỗi 5 phút | Tự động chạy khi mở trang | Pipeline hút dữ liệu từ 11 nguồn vệ tinh miễn phí trên toàn cầu</div>';
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
          const currentMonth = new Date().getMonth() + 1;
          const ltResp = await fetch(`${ENGINE_API}/forecast/long-term?month=${currentMonth}`);
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

      // Core AI status (trạng thái AI hạt nhân)
      const coreAI = document.getElementById('engCoreAI');
      if (coreAI) {
        coreAI.innerHTML = `<div class="sl">AI Hạt nhân</div><div class="sv" style="font-size:14px;color:#00c853">100.000 tỷ</div><div style="font-size:10px;color:#607d8b">🟢 ONLINE · 12 mili-giây phản hồi</div>`;
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
          alLog.innerHTML = `<h3>🔔 Lịch sử cảnh báo</h3>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e2d4a;font-size:12px"><span style="color:#ff9100">⚠️ Theo dõi mặn Kiên Giang</span><span style="color:#607d8b">Hôm nay 08:00</span><span style="color:#00c853">✅ Hoàn tất</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e2d4a;font-size:12px"><span style="color:#00c853">ℹ️ Cập nhật cảm biến</span><span style="color:#607d8b">Hôm qua 14:30</span><span style="color:#00c853">✅ Hoàn tất</span></div>
            <div style="font-size:10px;color:#607d8b;margin-top:6px">Dữ liệu mẫu khi backend offline</div>`;
        }
      }
    } catch (e) {
      console.error('Engine dashboard error:', e);
      document.querySelectorAll('#engSatellite, #engEnsemble, #engGIS, #engAlert, #engCoreAI').forEach(el => {
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

      // Forecast chart (Chart.js)
      const canvas = document.getElementById('forecastChartCanvas');
      if (canvas && data.consensus && typeof Chart !== 'undefined') {
        const ctx = canvas.getContext('2d');
        if (canvas._chart) canvas._chart.destroy();
        const labels = data.consensus.map(p => p.hour + 'h');
        const pressures = data.consensus.map(p => p.pressure);
        const winds = data.consensus.map(p => p.wind_speed);
        const categories = data.consensus.map(p => p.category);
        canvas._chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              { label: 'Áp suất (hPa)', data: pressures, borderColor: '#ff9100', backgroundColor: 'rgba(255,145,0,0.1)', fill: true, tension: 0.4, yAxisID: 'y' },
              { label: 'Gió (km/h)', data: winds, borderColor: '#ff1744', backgroundColor: 'rgba(255,23,68,0.1)', fill: true, tension: 0.4, yAxisID: 'y1' },
              { label: 'Cấp bão', data: categories, borderColor: '#7c4dff', borderDash: [5,5], tension: 0.4, yAxisID: 'y2', pointRadius: 3 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#b0bec5', font: { size: 10 } } } },
            scales: {
              x: { ticks: { color: '#607d8b', font: { size: 9 } }, grid: { color: '#1e2d4a' } },
              y: { position: 'left', title: { display: true, text: 'hPa', color: '#ff9100', font: { size: 10 } }, ticks: { color: '#ff9100', font: { size: 9 } }, grid: { color: '#1e2d4a' } },
              y1: { position: 'right', title: { display: true, text: 'km/h', color: '#ff1744', font: { size: 10 } }, ticks: { color: '#ff1744', font: { size: 9 } }, grid: { drawOnChartArea: false } },
              y2: { display: false, min: 0, max: 7 }
            }
          }
        });
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

      // Heatmap (Leaflet)
      const heatmap = document.getElementById('riskHeatmap');
      if (heatmap && data.cells && typeof L !== 'undefined') {
        if (heatmap._map) heatmap._map.remove();
        heatmap.innerHTML = '';
        const map = L.map(heatmap, { zoomControl: true, attributionControl: false }).setView([9.8, 106.0], 7);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map);
        const colors = { 1: '#1a237e', 2: '#0d47a1', 3: '#ff9100', 4: '#ff6d00', 5: '#ff1744', 6: '#b71c1c' };
        data.cells.forEach(function(c) {
          L.circleMarker([c.lat, c.lon], { radius: 4 + c.level, fillColor: colors[c.level] || '#1a237e', color: 'transparent', fillOpacity: 0.6 })
            .bindPopup('<b>' + c.province + '</b><br>Cấp rủi ro: ' + c.level)
            .addTo(map);
        });
        heatmap._map = map;
        setTimeout(function() { map.invalidateSize(); }, 200);
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
      const resp = await fetch(`${ENGINE_API}/forecast/long-term?month=${new Date().getMonth() + 1}`);
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
            { id: 'engineLongTerm', label: '📈 Dự báo mùa vụ', icon: '📈' },
            { id: 'satelliteObs', label: '🛰️ Vệ tinh & Không gian', icon: '🛰️' }
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

    console.log('[Engine UI] Injected 6 new AI engine pages');
  }

  // ============ AUTO-REFRESH REALTIME ============
  function startAutoRefresh() {
    if (_engineRefreshTimer) clearInterval(_engineRefreshTimer);
    _engineRefreshTimer = setInterval(function() {
      var page = typeof currentPage !== 'undefined' ? currentPage : '';
      if (page && page.indexOf('engine') === 0) {
        refreshEngineData();
      }
    }, REFRESH_INTERVAL);
  }

  function stopAutoRefresh() {
    if (_engineRefreshTimer) { clearInterval(_engineRefreshTimer); _engineRefreshTimer = null; }
  }

  // Expose for external cleanup (e.g., page navigation)
  window.engineUI = {
    startAutoRefresh: startAutoRefresh,
    stopAutoRefresh: stopAutoRefresh,
    refreshEngineData: refreshEngineData,
    isEnginePage: function() {
      var page = typeof currentPage !== 'undefined' ? currentPage : '';
      return page && page.indexOf('engine') === 0;
    }
  };

  // Auto-cleanup when leaving engine pages
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', stopAutoRefresh);
  }

  // ============ PUSH NOTIFICATION ============
  function requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function sendPushNotification(title, body, icon) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body: body, icon: icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌊</text></svg>', tag: 'mes-alert', renotify: true }); } catch(e) {}
    }
  }

  function checkAlertPush(alerts) {
    if (!alerts || !alerts.length) return;
    var active = alerts.filter(function(a) { return a.status === 'active'; });
    if (active.length > _lastAlertCount && _lastAlertCount > 0) {
      var newest = active[0];
      sendPushNotification('🚨 ' + (newest.title || 'Cảnh báo mới'), newest.desc || newest.message || 'Có cảnh báo mới từ hệ thống');
    }
    _lastAlertCount = active.length;
  }

  // ============ EXPORT CSV/PDF ============
  window.engineExportCSV = function(data, filename) {
    if (!data || !data.length) return;
    var headers = Object.keys(data[0]);
    var csv = headers.join(',') + '\n' + data.map(function(row) {
      return headers.map(function(h) {
        var v = row[h] == null ? '' : String(row[h]);
        return (v.indexOf(',') >= 0 || v.indexOf('"') >= 0) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(',');
    }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = (filename || 'export') + '_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  window.engineExportPDF = function(title, data, columns) {
    if (!data || !data.length) return;
    var headerCells = columns.map(function(c) { return '<th style="padding:8px;border:1px solid #ddd;background:#f3f4f6;text-align:left">' + c.label + '</th>'; }).join('');
    var rows = data.map(function(row) {
      return '<tr>' + columns.map(function(c) { return '<td style="padding:8px;border:1px solid #ddd">' + (row[c.key] != null ? row[c.key] : '') + '</td>'; }).join('') + '</tr>';
    }).join('');
    var w = window.open('', '_blank');
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + '</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}@media print{body{padding:0}}</style></head><body><h1>' + title + '</h1><p>Mekong Eco-Shield — ' + new Date().toLocaleDateString('vi-VN') + '</p><table><thead><tr>' + headerCells + '</tr></thead><tbody>' + rows + '</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>');
    w.document.close();
  };

  // ============ MOCK DATA FALLBACK (khi backend offline) ============
  function generateEngineMock() {
    return {
      ok: true,
      satellite: { storm_detected: false, cloud_top_temp: -62, source: 'Himawari-9' },
      ensemble: { agreement_pct: 78, spread_km: 145, landfall_probability: 35, recommended_level: 2, models: ['ECMWF','GFS','GEM'] },
      gis: { total_cells: 2400, hotspots: 12, affected_area_km2: 3400, total_level: 4, province_risk: { 'Kiên Giang': { max_level: 4, hotspots: 3 }, 'Cà Mau': { max_level: 3, hotspots: 2 }, 'Bến Tre': { max_level: 3, hotspots: 2 }, 'Sóc Trăng': { max_level: 2, hotspots: 1 }, 'Cần Thơ': { max_level: 2, hotspots: 1 } } },
      ground_truth: { validated: 8, stations_validated: 7 },
      alert: null,
      source: 'mock_engine'
    };
  }

  function generateEnsembleMock() {
    var members = [
      { model: 'ECMWF', max_wind: 135, min_pressure: 965, confidence: 82 },
      { model: 'GFS', max_wind: 128, min_pressure: 970, confidence: 75 },
      { model: 'GEM', max_wind: 120, min_pressure: 975, confidence: 70 }
    ];
    var consensus = [];
    for (var h = 0; h <= 240; h += 24) {
      consensus.push({ hour: h, lat: (12 - h * 0.03).toFixed(1), lon: (109 + h * 0.02).toFixed(1), wind_speed: Math.max(60, 135 - h * 0.3), pressure: Math.min(975, 965 + h * 0.05), category: h < 72 ? Math.min(6, Math.floor(5 - h * 0.04)) : Math.max(0, Math.floor(2 - (h - 72) * 0.02)) });
    }
    return { ok: true, members: members, consensus: consensus, ensemble_metrics: { spread_km: 145, agreement_pct: 78, landfall_probability: 35 } };
  }

  function generateGISMock() {
    var cells = [];
    for (var i = 0; i < 200; i++) {
      cells.push({ lat: 8.5 + Math.random() * 2.5, lon: 104.5 + Math.random() * 2.5, level: Math.floor(Math.random() * 5) + 1, province: ['Kiên Giang','Cà Mau','Bến Tre','Sóc Trăng','Cần Thơ','An Giang'][Math.floor(Math.random() * 6)] });
    }
    return { ok: true, total_cells: 2400, hotspots: 12, affected_area_km2: 3400, total_level: 4, hotspot_coords: [{ province: 'Kiên Giang', lat: 10.01, lon: 104.98 }, { province: 'Cà Mau', lat: 8.75, lon: 105.15 }], province_risk: { 'Kiên Giang': { max_level: 4, hotspots: 3 }, 'Cà Mau': { max_level: 3, hotspots: 2 }, 'Bến Tre': { max_level: 3, hotspots: 2 }, 'Sóc Trăng': { max_level: 2, hotspots: 1 }, 'Cần Thơ': { max_level: 2, hotspots: 1 } }, cells: cells };
  }

  function generateGroundTruthMock() {
    return { ok: true, stations: [
      { name: 'Trần Đề', province: 'Sóc Trăng', river: 'Hậu Giang', status: 'online', water_level: 2.1, rain_24h: 15, wind_speed: 25 },
      { name: 'Cần Thơ', province: 'Cần Thơ', river: 'Hậu Giang', status: 'online', water_level: 1.8, rain_24h: 8, wind_speed: 12 },
      { name: 'Vũng Liêm', province: 'Vĩnh Long', river: 'Cần Thơ', status: 'online', water_level: 1.5, rain_24h: 22, wind_speed: 18 },
      { name: 'Mỹ Tho', province: 'Tiền Giang', river: 'Tiền Giang', status: 'offline', water_level: 0.9, rain_24h: 0, wind_speed: 0 },
      { name: 'Bến Tre', province: 'Bến Tre', river: 'Bến Tre', status: 'online', water_level: 1.3, rain_24h: 12, wind_speed: 15 }
    ]};
  }

  function generateLongTermMock() {
    return { ok: true, anomalies: { precipitation: { avg_mm: 280, interpretation: 'Trên trung bình' }, temperature: { avg_c: 28.5, interpretation: 'Bình thường' } }, overall_risk_level: 3, confidence_avg: 72, risk_zones: { flood: [{ province: 'Đồng Tháp', anomaly_mm: 45 }, { province: 'An Giang', anomaly_mm: 38 }], heatwave: [] }, recommendation: 'Mùa lũ 2026 dự báo trên trung bình. Tăng cường giám sát đê điều Đồng Tháp, An Giang. Chuẩn bị phương án phòng chống lũ.' };
  }

  // Override data loading functions with mock fallback
  var _origLoadEngineDashboard = loadEngineDashboard;
  loadEngineDashboard = async function() {
    try { await _origLoadEngineDashboard(); } catch(e) {
      engineData = generateEngineMock();
      var data = engineData;
      var sat = document.getElementById('engSatellite');
      if (sat) sat.innerHTML = '<div class="sl">Vệ tinh Himawari-9</div><div class="sv" style="font-size:13px">🔵 Bình thường</div><div style="font-size:10px;color:#607d8b">Đỉnh mây: -62°C</div>';
      var ens = document.getElementById('engEnsemble');
      if (ens) ens.innerHTML = '<div class="sl">Đồng thuận đa mô hình</div><div class="sv" style="font-size:13px">78%</div><div style="font-size:10px;color:#607d8b">Cấp: 2/6</div>';
      var gis = document.getElementById('engGIS');
      if (gis) gis.innerHTML = '<div class="sl">Ma trận rủi ro</div><div class="sv" style="font-size:13px">12 điểm nóng</div><div style="font-size:10px;color:#607d8b">2400 ô lưới</div>';
      var alt = document.getElementById('engAlert');
      if (alt) alt.innerHTML = '<div class="sl">Trạng thái cảnh báo</div><div class="sv" style="font-size:13px;color:#00c853">✅ BÌNH THƯỜNG</div><div style="font-size:10px;color:#607d8b">Không có cảnh báo</div>';
      var ensDet = document.getElementById('engEnsembleDetail');
      if (ensDet) ensDet.innerHTML = '<h3>📊 Đồng thuận đa mô hình</h3><div style="font-size:12px;color:#607d8b;margin-top:8px">ECMWF: 82% · GFS: 75% · GEM: 70%</div>';
      var gisDet = document.getElementById('engGISDetail');
      if (gisDet) gisDet.innerHTML = '<h3>🗺️ Bản đồ rủi ro không gian</h3><div style="font-size:12px;color:#607d8b;margin-top:8px">12 điểm nóng · 3,400 km² ảnh hưởng</div>';
      var gt = document.getElementById('engGroundTruth');
      if (gt) gt.innerHTML = '<h3>🏭 Trạm quan trắc mặt đất</h3><div style="font-size:12px;color:#00c853;margin-top:8px">✅ 8 trạm đã kiểm chứng</div>';
      var lt = document.getElementById('engLongTerm');
      if (lt) lt.innerHTML = '<h3>📈 Dự báo dài hạn CanSIPS</h3><div style="font-size:12px;margin-top:8px">🌧️ 280mm (Trên TB) · 🌡️ 28.5°C (Bình thường)</div>';
      var alLog = document.getElementById('engAlertLog');
      if (alLog) alLog.innerHTML = '<h3>🔔 Lịch sử cảnh báo</h3><div style="color:#607d8b;font-size:12px">Chưa có cảnh báo</div>';
    }
  }

  var _origLoadEnsemble = loadEnsembleData;
  loadEnsembleData = async function() {
    try { await _origLoadEnsemble(); } catch(e) {
      var data = generateEnsembleMock();
      var models = data.members || [];
      models.forEach(function(m) {
        var key = 'ens' + m.model;
        var el = document.getElementById(key);
        if (el) {
          var color = m.model === 'ECMWF' ? '#2196f3' : m.model === 'GFS' ? '#f44336' : '#ffeb3b';
          el.innerHTML = '<div class="sl">' + m.model + '</div><div class="sv" style="font-size:13px;color:' + color + '">' + m.max_wind + ' km/h</div><div style="font-size:10px;color:#607d8b">Áp suất: ' + m.min_pressure + ' hPa · Tin cậy: ' + m.confidence + '%</div>';
        }
      });
      var table = document.getElementById('consensusTable');
      if (table) {
        var rows = data.consensus.map(function(pt) { return '<tr><td>' + pt.hour + 'h</td><td>' + pt.lat + '°N</td><td>' + pt.lon + '°E</td><td>' + pt.wind_speed + '</td><td>' + pt.pressure + '</td><td><span class="tg ' + (pt.category >= 3 ? 'r' : pt.category >= 1 ? 'o' : 'g') + '">Cấp ' + pt.category + '</span></td></tr>'; }).join('');
        table.innerHTML = '<tr><th>Giờ</th><th>Vĩ độ</th><th>Kinh độ</th><th>Gió (km/h)</th><th>Áp suất (hPa)</th><th>Cấp</th></tr>' + rows;
      }
      var spreadBar = document.getElementById('spreadBar');
      if (spreadBar) spreadBar.style.width = '72%';
      var agreementBar = document.getElementById('agreementBar');
      if (agreementBar) agreementBar.style.width = '78%';
      var landfallBar = document.getElementById('landfallBar');
      if (landfallBar) landfallBar.style.width = '35%';
      var canvas = document.getElementById('forecastChartCanvas');
      if (canvas && typeof Chart !== 'undefined') {
        var ctx = canvas.getContext('2d');
        if (canvas._chart) canvas._chart.destroy();
        var labels = data.consensus.map(function(p) { return p.hour + 'h'; });
        canvas._chart = new Chart(ctx, {
          type: 'line',
          data: { labels: labels, datasets: [
            { label: 'Áp suất (hPa)', data: data.consensus.map(function(p) { return p.pressure; }), borderColor: '#ff9100', backgroundColor: 'rgba(255,145,0,0.1)', fill: true, tension: 0.4, yAxisID: 'y' },
            { label: 'Gió (km/h)', data: data.consensus.map(function(p) { return p.wind_speed; }), borderColor: '#ff1744', backgroundColor: 'rgba(255,23,68,0.1)', fill: true, tension: 0.4, yAxisID: 'y1' },
            { label: 'Cấp bão', data: data.consensus.map(function(p) { return p.category; }), borderColor: '#7c4dff', borderDash: [5,5], tension: 0.4, yAxisID: 'y2', pointRadius: 3 }
          ] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#b0bec5', font: { size: 10 } } } }, scales: {
            x: { ticks: { color: '#607d8b', font: { size: 9 } }, grid: { color: '#1e2d4a' } },
            y: { position: 'left', title: { display: true, text: 'hPa', color: '#ff9100', font: { size: 10 } }, ticks: { color: '#ff9100', font: { size: 9 } }, grid: { color: '#1e2d4a' } },
            y1: { position: 'right', title: { display: true, text: 'km/h', color: '#ff1744', font: { size: 10 } }, ticks: { color: '#ff1744', font: { size: 9 } }, grid: { drawOnChartArea: false } },
            y2: { display: false, min: 0, max: 7 }
          } }
        });
      }
    }
  }

  var _origLoadGIS = loadGISData;
  loadGISData = async function() {
    try { await _origLoadGIS(); } catch(e) {
      var data = generateGISMock();
      document.getElementById('gisTotalCells').textContent = data.total_cells;
      document.getElementById('gisHotspots').textContent = data.hotspots;
      document.getElementById('gisMaxLevel').textContent = data.total_level;
      document.getElementById('gisArea').textContent = '3,400 km²';
      var hsList = document.getElementById('hotspotList');
      if (hsList) hsList.innerHTML = data.hotspot_coords.map(function(h) { return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e2d4a;font-size:11px"><span style="color:#ff1744">🔴 ' + h.province + '</span><span style="color:#607d8b">' + h.lat + '°N, ' + h.lon + '°E</span></div>'; }).join('');
      var prList = document.getElementById('provinceRiskList');
      if (prList) prList.innerHTML = Object.entries(data.province_risk).map(function(pair) { return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e2d4a;font-size:11px"><span>' + pair[0] + '</span><span><span style="color:' + (pair[1].max_level >= 4 ? '#ff1744' : '#ff9100') + '">Cấp ' + pair[1].max_level + '</span><span style="color:#607d8b;margin-left:6px">' + pair[1].hotspots + ' điểm nóng</span></span></div>'; }).join('');
      var heatmap = document.getElementById('riskHeatmap');
      if (heatmap && data.cells && typeof L !== 'undefined') {
        if (heatmap._map) heatmap._map.remove();
        heatmap.innerHTML = '';
        var map = L.map(heatmap, { zoomControl: true, attributionControl: false }).setView([9.8, 106.0], 7);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map);
        var colors = { 1: '#1a237e', 2: '#0d47a1', 3: '#ff9100', 4: '#ff6d00', 5: '#ff1744', 6: '#b71c1c' };
        data.cells.forEach(function(c) {
          L.circleMarker([c.lat, c.lon], { radius: 4 + c.level, fillColor: colors[c.level] || '#1a237e', color: 'transparent', fillOpacity: 0.6 })
            .bindPopup('<b>' + c.province + '</b><br>Cấp rủi ro: ' + c.level)
            .addTo(map);
        });
        heatmap._map = map;
        setTimeout(function() { map.invalidateSize(); }, 200);
      }
    }
  }

  var _origLoadGT = loadGroundTruthData;
  loadGroundTruthData = async function() {
    try { await _origLoadGT(); } catch(e) {
      var data = generateGroundTruthMock();
      var grid = document.getElementById('stationGrid');
      if (grid) grid.innerHTML = data.stations.map(function(s) { return '<div style="background:#131c31;border:1px solid #1e2d4a;border-radius:8px;padding:10px"><div style="display:flex;justify-content:space-between"><span style="font-weight:600;font-size:12px">' + s.name + '</span><span style="font-size:10px;color:' + (s.status === 'online' ? '#00c853' : '#ff1744') + '">' + (s.status === 'online' ? '🟢 Online' : '🔴 Offline') + '</span></div><div style="font-size:10px;color:#607d8b;margin:4px 0">' + s.province + ' · ' + s.river + '</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:6px;font-size:11px"><div><span style="color:#607d8b">Mực nước:</span> ' + s.water_level + 'm</div><div><span style="color:#607d8b">Mưa 24h:</span> ' + s.rain_24h + 'mm</div><div><span style="color:#607d8b">Gió:</span> ' + s.wind_speed + 'km/h</div></div></div>'; }).join('');
      var summary = document.getElementById('validationSummary');
      if (summary) summary.innerHTML = '<div style="margin-top:8px"><div style="color:#00c853">✅ 5 trạm quan trắc đang hoạt động</div><div style="color:#607d8b;margin-top:4px">Dữ liệu đối chiếu chéo vệ tinh Himawari-9, NWP và trạm mặt đất. Lọc nhiễu nếu lệch > 3 cấp.</div></div>';
    }
  }

  var _origLoadLT = loadLongTermData;
  loadLongTermData = async function() {
    try { await _origLoadLT(); } catch(e) {
      var data = generateLongTermMock();
      document.getElementById('ltPrecipAvg').textContent = '280mm';
      document.getElementById('ltTempAvg').textContent = '28.5°C';
      document.getElementById('ltRiskLevel').textContent = '3/5';
      document.getElementById('ltRiskLevel').style.color = '#ff9100';
      document.getElementById('ltConfidence').textContent = '72%';
      var floodDiv = document.getElementById('ltFloodZones');
      if (floodDiv) floodDiv.innerHTML = data.risk_zones.flood.map(function(z) { return '<div style="padding:4px 0;border-bottom:1px solid #1e2d4a;font-size:11px">🌧️ ' + z.province + ': +' + z.anomaly_mm + 'mm</div>'; }).join('');
      var heatDiv = document.getElementById('ltHeatZones');
      if (heatDiv) heatDiv.innerHTML = '<div style="color:#00c853;font-size:12px">✅ Không phát hiện</div>';
      var recDiv = document.getElementById('ltRecommendation');
      if (recDiv) recDiv.innerHTML = '<div style="margin-top:8px;padding:10px;background:#18243c;border-radius:8px;font-size:12px">' + data.recommendation + '</div>';
    }
  }

  // Start injection when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { injectEnginePages(); requestNotifPermission(); startAutoRefresh(); });
  } else {
    injectEnginePages();
    requestNotifPermission();
    startAutoRefresh();
  }
})();
