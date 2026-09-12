/* MEKONG ECO-SHIELD v114 — 10 tính năng nâng cấp (file độc lập, không sửa index.html) */
(function () {
  'use strict';
  if (!window.PAGES) return;
  var V = 'v114';
  var PROVINCES = [
    { n: 'An Giang', lat: 10.42, lon: 105.25 },
    { n: 'Đồng Tháp', lat: 10.36, lon: 105.63 },
    { n: 'Tiền Giang', lat: 10.36, lon: 106.36 },
    { n: 'Bến Tre', lat: 10.24, lon: 106.38 },
    { n: 'Vĩnh Long', lat: 10.25, lon: 105.97 },
    { n: 'Trà Vinh', lat: 9.95, lon: 106.34 },
    { n: 'Cần Thơ', lat: 10.03, lon: 105.78 },
    { n: 'Hậu Giang', lat: 9.77, lon: 105.65 },
    { n: 'Sóc Trăng', lat: 9.60, lon: 105.97 },
    { n: 'Bạc Liêu', lat: 9.29, lon: 105.72 },
    { n: 'Cà Mau', lat: 9.18, lon: 105.15 },
    { n: 'Kiên Giang', lat: 10.01, lon: 105.09 },
    { n: 'Long An', lat: 10.68, lon: 106.42 }
  ];
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function toast(t, m) { if (window.toast) window.toast(t, m); }
  function cb() { return window.cb ? window.cb() : ''; }
  function getU() { return window.U || null; }
  function getLatLon() {
    var ll = null;
    try { ll = JSON.parse(localStorage.getItem('mes_last_ll') || 'null'); } catch (e) {}
    return ll || { lat: 10.03, lon: 105.78 };
  }
  function saveLL(lat, lon) { try { localStorage.setItem('mes_last_ll', JSON.stringify({ lat: lat, lon: lon })); } catch (e) {} }
  function d2r(d) { return d * Math.PI / 180; }
  function haversineKm(lat1, lon1, lat2, lon2) {
    var R = 6371, dLat = d2r(lat2 - lat1), dLon = d2r(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(d2r(lat1)) * Math.cos(d2r(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
  var STATUS_STYLE = { danger: '#d32f2f', warning: '#ff6d00', watch: '#ffc107', normal: '#00c853' };
  function statusOf(p) {
    var s = Number(p.salinity) || 0, ph = Number(p.ph) || 7, d = Number(p.do_amount) || 6;
    if (s > 8 || ph < 5 || ph > 9 || d < 2) return 'danger';
    if (s > 4 || ph < 6 || ph > 8.5 || d < 4) return 'warning';
    if (s > 2 || d < 5) return 'watch';
    return 'normal';
  }
  var CROPS = [
    { n: 'Lúa OM18', maxS: 2, note: 'Chịu mặn tốt, ngắn ngày 100–105 ngày', cat: 'lua' },
    { n: 'Lúa ST25', maxS: 3, note: 'Gạo thơm đặc sản, chịu mặn khá', cat: 'lua' },
    { n: 'Mãng cầu dai', maxS: 4, note: 'Kháng mặn 4‰, phù hợp Bến Tre', cat: 'cay' },
    { n: 'Xoài cát Hòa Lộc', maxS: 3, note: 'Chịu mặn nhẹ, cần tưới ngọt', cat: 'cay' },
    { n: 'Cá tra', maxS: 5, note: 'Nuôi ao chịu mặn đến 5‰', cat: 'thuy' },
    { n: 'Tôm thẻ chân trắng', maxS: 15, note: 'Chịu mặn cao 5–15‰, thích hợp vùng ven biển', cat: 'thuy' },
    { n: 'Rau muống', maxS: 2, note: 'Nhạy mặn, trồng khi nước ngọt', cat: 'rau' },
    { n: 'Dưa hấu', maxS: 2.5, note: 'Chịu mặn trung bình, vụ hè thu', cat: 'rau' }
  ];
  var CHECKLISTS = {
    yellow: ['Kiểm tra cống rãnh, khai thông thoát nước', 'Gia cố chuồng trại, mái che', 'Sạc đèn pin, điện thoại, dự trữ nước sạch', 'Theo dõi bản tin dự báo trong 24h tới'],
    orange: ['Sơ tán tài sản di động đến nơi cao', 'Buộc chặt vật dụng, mái tôn, cây trồng', 'Chuẩn bị balo sinh tồn (nước, lương khô, thuốc)', 'Gia cố bờ bao, bơm tiêu nước', 'Sẵn sàng di dời khi có lệnh'],
    red: ['NGẮT CẦU DAO ĐIỆN NGAY', 'KHÓA VAN GAS, TẮT BẾP', 'DI CHUYỂN LÊN TẦNG CAO/ĐỒI', 'Mang theo giấy tờ, tiền bạc, thuốc men', 'Không băng qua vùng ngập, dòng chảy mạnh', 'Gọi 115 nếu bị mắc kẹt']
  };
  var LEVEL_COLOR = { yellow: '#ffc107', orange: '#ff6d00', red: '#d32f2f', green: '#00c853' };
  var LEVEL_ICON = { yellow: '⚠️', orange: '🚨', red: '🚨', green: '✅' };

  /* ============ DATA BRIDGE (offline queue) ============ */
  function dbQ() { try { return JSON.parse(localStorage.getItem('mes_sos_queue') || '[]'); } catch (e) { return []; } }
  function dbSave(report) {
    if (navigator.onLine !== false) return false;
    var q = dbQ(); q.push(report); try { localStorage.setItem('mes_sos_queue', JSON.stringify(q)); } catch (e) {}
    toast('📡 Offline', 'Đã lưu vào hàng đợi, sẽ gửi khi có mạng (' + q.length + ' báo cáo)');
    return true;
  }
  function flushQueue() {
    var q = dbQ(); if (!q.length) return;
    var ok = 0, left = [];
    var chain = Promise.resolve();
    q.forEach(function (r) {
      chain = chain.then(function () {
        return fetch((window.API_BASE || '/api') + '/crowd', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r)
        }).then(function (resp) { return resp.json(); }).then(function (d) { if (d && d.ok) ok++; else left.push(r); })
          .catch(function () { left.push(r); });
      });
    });
    chain.then(function () { try { localStorage.setItem('mes_sos_queue', JSON.stringify(left)); } catch (e) {} toast('🎉 Đồng bộ', 'Đã gửi ' + ok + ' báo cáo offline'); });
  }
  if (window.addEventListener) window.addEventListener('online', flushQueue);

  /* ============ 1. MARKETPLACE search/filter/sort ============ */
  function mktToolbarHTML(cat, sort) {
    return '<div style="margin-bottom:10px;display:grid;gap:6px;grid-template-columns:1fr;background:#0d1526;border:1px solid #1e2d4a;border-radius:10px;padding:10px">' +
      '<input id="mpSearch" placeholder="🔍 Tìm sản phẩm..." value="" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
      '<select id="mpCat" style="background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:8px;font-size:12px"><option value="">Tất cả</option><option>Rau củ</option><option>Trái cây</option><option>Thủy sản</option><option>Gạo</option><option>Khác</option></select>' +
      '<select id="mpSort" style="background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:8px;font-size:12px"><option value="new">🕒 Mới nhất</option><option value="asc">💹 Giá tăng</option><option value="desc">📉 Giá giảm</option><option value="az">🔤 Tên A-Z</option></select>' +
      '</div></div>';
  }
  window.MES_MKT_CACHE = [];
  window.loadMarketplace = function () {
    var el = document.getElementById('mpProducts');
    if (!el) return;
    var out = '<div id="mpToolbarWrap"></div><div id="mpGrid" style="display:grid;grid-template-columns:1fr;gap:10px">' +
      '<div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Đang tải...</div></div>';
    el.innerHTML = out;
    fetch((window.API_BASE || '/api') + '/products').then(function (r) { return r.json(); }).then(function (d) {
      window.MES_MKT_CACHE = (d && d.ok && d.products) ? d.products : [];
      var tw = document.getElementById('mpToolbarWrap');
      if (tw) tw.innerHTML = mktToolbarHTML();
      var sb = document.getElementById('mpSearch'), sc = document.getElementById('mpCat'), ss = document.getElementById('mpSort');
      if (sb) sb.addEventListener('input', renderMkt);
      if (sc) sc.addEventListener('change', renderMkt);
      if (ss) ss.addEventListener('change', renderMkt);
      renderMkt();
    }).catch(function () {
      el.innerHTML = '<div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Không tải được sản phẩm</div>';
    });
  };
  function renderMkt() {
    var g = document.getElementById('mpGrid'); if (!g) return;
    var q = (document.getElementById('mpSearch') || {}).value || '';
    var c = (document.getElementById('mpCat') || {}).value || '';
    var srt = (document.getElementById('mpSort') || {}).value || 'new';
    var items = window.MES_MKT_CACHE.filter(function (p) {
      var hay = (p.name + ' ' + (p.descr || '') + ' ' + (p.seller_email || '')).toLowerCase();
      var ql = q.toLowerCase();
      if (q && hay.indexOf(ql) < 0) return false;
      if (c) { var pc = (p.category || p.cat || 'Khác') + ''; if (pc.indexOf(c) < 0 && c.indexOf(pc) < 0 && !(c === 'Khác' && pc === '')) return false; }
      return true;
    });
    if (srt === 'asc') items.sort(function (a, b) { return (Number(a.price) || 0) - (Number(b.price) || 0); });
    else if (srt === 'desc') items.sort(function (a, b) { return (Number(b.price) || 0) - (Number(a.price) || 0); });
    else if (srt === 'az') items.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'vi'); });
    if (!items.length) { g.innerHTML = '<div style="color:#607d8b;font-size:11px;text-align:center;padding:30px;grid-column:span 2">Không có sản phẩm phù hợp</div>'; return; }
    g.style.gridTemplateColumns = '1fr 1fr';
    g.innerHTML = items.map(function (p) {
      var st = p.st === 'sold' ? '<div style="background:rgba(211,47,47,.15);color:#ef5350;font-size:9px;border-radius:6px;padding:2px 6px;display:inline-block;margin-top:4px">ĐÃ BÁN</div>' : '';
      return '<div style="background:#131c31;border:1px solid #1e2d4a;border-radius:10px;overflow:hidden">' +
        '<div style="height:80px;background:linear-gradient(135deg,' + (p.img ? 'url(' + esc(p.img) + ') center/cover' : 'rgba(0,200,83,.15),rgba(0,188,212,.1)') + ');background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;font-size:30px">' + (p.img ? '' : '🥬') + '</div>' +
        '<div style="padding:10px"><div style="font-size:11px;font-weight:700;color:#e8eaf6">' + esc(p.name) + '</div>' +
        '<div style="font-size:9px;color:#607d8b;margin-top:2px">' + esc(p.seller_email) + '</div>' +
        (p.descr ? '<div style="font-size:9px;color:#90a4ae;margin-top:4px;line-height:1.4">' + esc(p.descr) + '</div>' : '') +
        '<div style="font-size:13px;font-weight:700;color:#00e676;margin-top:6px">' + esc(p.price) + ' đ/' + esc(p.unit || 'kg') + '</div>' + st + '</div></div>';
    }).join('');
  }

  /* ============ 2. FORECAST 7 NGÀY (Open-Meteo) ============ */
  function fcRender(p) {
    var u = getU();
    if (!u) return cb();
    var opts = PROVINCES.map(function (x) { return '<option value="' + x.lat + ',' + x.lon + '">' + x.n + '</option>'; }).join('');
    var saved = '10.03,105.78';
    try { saved = localStorage.getItem('mes_fc_ll') || saved; } catch (e) {}
    var sel = '<option value="">— Chọn tỉnh —</option>' + opts;
    return '<div class="pt">🌤️ Dự báo thời tiết 7 ngày</div><div class="ps">MEKONG ECO-SHIELD — Open-Meteo, cập nhật theo giờ</div>' +
      '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:12px">' +
      '<select id="fcProv" style="background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' + sel + '</select>' +
      '<button class="btn bp" onclick="MES_V114.forecast()">Xem dự báo</button></div>' +
      '<div id="fcOut"><div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Chọn tỉnh và bấm "Xem dự báo"</div></div>' + cb();
  }
  function forecast() {
    var o = document.getElementById('fcOut'); if (!o) return;
    var sel = document.getElementById('fcProv'); if (!sel || !sel.value) { toast('⚠️ Chọn tỉnh', 'Vui lòng chọn tỉnh cần xem'); return; }
    var v = sel.value.split(','), lat = v[0], lon = v[1];
    try { localStorage.setItem('mes_fc_ll', lat + ',' + lon); } catch (e) {}
    o.innerHTML = '<div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Đang tải dự báo 7 ngày...</div>';
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&daily=precipitation_sum,wind_gusts_10m_max,weather_code&timezone=Asia%2FBangkok')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.daily) { o.innerHTML = '<div style="color:#f44336;font-size:11px;text-align:center;padding:30px">Không lấy được dữ liệu thời tiết</div>'; return; }
        var ds = d.daily.time || [], pr = d.daily.precipitation_sum || [], wg = d.daily.wind_gusts_10m_max || [], wc = d.daily.weather_code || [];
        var DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        var cards = ds.map(function (day, i) {
          var dt = new Date(day + 'T00:00:00');
          var icon = '☀️'; var code = Number(wc[i]);
          if (code >= 95) icon = '⛈️'; else if (code >= 80) icon = '🌧️'; else if (code >= 71) icon = '🌧️'; else if (code >= 61) icon = '🌦️'; else if (code >= 51) icon = '🌦️'; else if (code >= 45) icon = '🌫️';
          var rain = Number(pr[i]) || 0, gust = Number(wg[i]) || 0;
          var risk = '';
          if (rain > 50) risk = '<div style="background:rgba(211,47,47,.18);color:#ef5350;font-size:9px;border-radius:6px;padding:3px 6px;margin-top:4px">🔴 Nguy cơ ngập >50mm</div>';
          else if (gust > 75) risk = '<div style="background:rgba(255,109,0,.18);color:#ff9800;font-size:9px;border-radius:6px;padding:3px 6px;margin-top:4px">🟠 Gió mạnh >75km/h</div>';
          else if (rain > 30) risk = '<div style="background:rgba(255,193,7,.15);color:#ffd54f;font-size:9px;border-radius:6px;padding:3px 6px;margin-top:4px">🟡 Mưa lớn ' + Math.round(rain) + 'mm</div>';
          return '<div style="background:#131c31;border:1px solid #1e2d4a;border-radius:10px;padding:10px;text-align:center">' +
            '<div style="font-size:10px;color:#90a4ae">' + DOW[dt.getDay()] + '</div>' +
            '<div style="font-size:20px;margin:6px 0">' + icon + '</div>' +
            '<div style="font-size:10px;color:#e8eaf6">' + Math.round(rain) + 'mm</div>' +
            '<div style="font-size:9px;color:#80d8ff">💨 ' + Math.round(gust) + ' km/h</div>' + risk + '</div>';
        }).join('');
        o.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px">' + cards + '</div>' +
          '<div style="margin-top:10px;font-size:9px;color:#607d8b">Nguồn: Open-Meteo (dữ liệu 7 ngày tới, cập nhật tự động). Cảnh báo: mưa >50mm/ngày = nguy cơ ngập; gió giật >75km/h = gió mạnh.</div>';
      })
      .catch(function () { o.innerHTML = '<div style="color:#f44336;font-size:11px;text-align:center;padding:30px">Lỗi kết nối Open-Meteo</div>'; });
  }

  /* ============ 3. CHẤT LƯỢNG NƯỚC ============ */
  function wqRender(p) {
    var u = getU();
    if (!u) return cb();
    return '<div class="pt">💧 Giám sát chất lượng nước</div><div class="ps">pH, độ mặn, độ đục, DO — 8 trạm DBSCL</div>' +
      '<div style="margin-bottom:12px"><button class="btn bp" onclick="MES_V114.newWQ()">➕ Ghi nhận đo mới</button></div>' +
      '<div id="wqTable"><div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Đang tải...</div></div>' + cb();
  }
  function loadWQ() {
    var el = document.getElementById('wqTable'); if (!el) return;
    fetch((window.API_BASE || '/api') + '/water-quality').then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok || !d.data || !d.data.length) { el.innerHTML = '<div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Chưa có dữ liệu</div>'; return; }
      var st = d.data[0] && d.data[0].station ? 'Tự động' : 'Tự động';
      var rows = d.data.map(function (r) {
        var s = statusOf(r), c = STATUS_STYLE[s] || '#00c853';
        return '<tr style="border-bottom:1px solid #1e2d4a"><td>' + esc(r.station) + '</td><td>' + esc(r.province) + '</td><td>' + esc(r.ph) + '</td><td>' + esc(r.salinity) + '‰</td><td>' + esc(r.turbidity) + 'NTU</td><td>' + esc(r.do_amount) + 'mg/L</td><td>' + esc(r.temperature) + '°C</td>' +
          '<td><span style="background:' + c + '22;color:' + c + ';border:1px solid ' + c + '66;border-radius:6px;padding:2px 8px;font-size:9px;font-weight:700">' + s.toUpperCase() + '</span></td>' +
          '<td style="font-size:9px;color:#607d8b">' + esc((r.ts || '').replace('T', ' ').slice(0, 16)) + '</td></tr>';
      }).join('');
      el.innerHTML = '<div style="font-size:9px;color:#607d8b;margin-bottom:6px">(Cập nhật tự động từ các trạm quan trắc — trạng thái tự phân cấp theo tiêu chuẩn)</div>' +
        '<div style="overflow-x:auto"><table class="dt" style="width:100%"><thead style="position:sticky;top:0;background:#0b1120;z-index:2"><tr><th>Trạm</th><th>Tỉnh</th><th>pH</th><th>Độ mặn</th><th>Độ đục</th><th>DO</th><th>Nhiệt độ</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).catch(function () { el.innerHTML = '<div style="color:#f44336;font-size:11px;text-align:center;padding:30px">Lỗi tải dữ liệu nước</div>'; });
  }
  function newWQ() {
    var m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML = '<div style="background:#0d1526;border:1px solid #1e2d4a;border-radius:12px;padding:16px;width:100%;max-width:360px;max-height:90vh;overflow-y:auto">' +
      '<div style="font-size:14px;font-weight:700;color:#e8eaf6;margin-bottom:12px">➕ Ghi nhận đo chất lượng nước</div>' +
      '<div style="display:grid;gap:8px">' +
      '<input id="wqStation" placeholder="Tên trạm/kênh rạch (vd: Kênh Xáng)" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '<select id="wqProv" style="background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' + PROVINCES.map(function (x) { return '<option>' + x.n + '</option>'; }).join('') + '</select>' +
      '<input id="wqPh" type="number" step="0.1" placeholder="pH (6.5–8.5)" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '<input id="wqSal" type="number" step="0.1" placeholder="Độ mặn ‰" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '<input id="wqTur" type="number" step="1" placeholder="Độ đục NTU" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '<input id="wqDo" type="number" step="0.1" placeholder="DO mg/L" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '<input id="wqTemp" type="number" step="0.1" placeholder="Nhiệt độ °C" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">' +
      '<button class="btn bs" onclick="this.closest(\'div\').parentNode.remove()">Hủy</button>' +
      '<button class="btn bp" onclick="MES_V114.submitWQ()">Lưu đo</button></div></div>';
    document.body.appendChild(m);
  }
  function submitWQ() {
    var b = { station: document.getElementById('wqStation').value, province: document.getElementById('wqProv').value, ph: document.getElementById('wqPh').value, salinity: document.getElementById('wqSal').value, turbidity: document.getElementById('wqTur').value, do_amount: document.getElementById('wqDo').value, temperature: document.getElementById('wqTemp').value };
    if (!b.station) { toast('⚠️ Thiếu tên trạm', 'Nhập tên trạm/kênh rạch'); return; }
    var modals = document.querySelectorAll('div[style*="9998"]');
    modals.forEach(function (x) { x.remove(); });
    fetch((window.API_BASE || '/api') + '/water-quality', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.ok) { toast('✅ Đã lưu đo', 'Cập nhật vào hệ thống quan trắc'); loadWQ(); }
        else { toast('❌ Lỗi', (d && d.error) || 'Không lưu được'); }
      }).catch(function () { toast('❌ Lỗi', 'Mất kết nối server'); });
  }

  /* ============ 4. GỢI Ý GIỐNG CÂY ============ */
  function csRender(p) {
    var u = getU();
    if (!u) return cb();
    var ll = getLatLon();
    return '<div class="pt">🌱 Gợi ý giống cây thông minh</div><div class="ps">Chọn giống theo độ mặn nước — an toàn, năng suất, đúng thị trường</div>' +
      '<div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-bottom:12px;align-items:center">' +
      '<input id="csSal" type="number" step="0.1" min="0" max="20" value="0.5" placeholder="Độ mặn ‰" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '<button class="btn bs" onclick="MES_V114.csUseWQ()" title="Lấy độ mặn từ trạm nước">📡 Từ trạm</button>' +
      '<button class="btn bp" onclick="MES_V114.suggest()">Gợi ý</button></div>' +
      '<div id="csOut"><div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Nhập độ mặn (${\'\'}‰) hoặc lấy từ trạm quan trắc</div></div>' + cb();
  }
  function csUseWQ() {
    fetch((window.API_BASE || '/api') + '/water-quality').then(function (r) { return r.json(); }).then(function (d) {
      var el = document.getElementById('csSal');
      if (d && d.ok && d.data && d.data.length && el) { el.value = Number(d.data[0].salinity) || 0.5; toast('📡 Đã lấy', 'Độ mặn trạm ' + esc(d.data[0].station) + ': ' + d.data[0].salinity + '‰'); }
    }).catch(function () {});
  }
  function suggest() {
    var o = document.getElementById('csOut'); if (!o) return;
    var el = document.getElementById('csSal'); var s = Number(el.value);
    if (isNaN(s)) { toast('⚠️ Độ mặn', 'Nhập số độ mặn (‰)'); return; }
    o.innerHTML = '<div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Đang phân tích...</div>';
    fetch((window.API_BASE || '/api') + '/crops/suggest?salinity=' + s).then(function (r) { return r.json(); }).then(function (d) {
      var arr = (d && d.ok && d.suggestions) ? d.suggestions : CROPS.map(function (c) {
        var ok = s <= c.maxS ? 'tốt' : (s <= c.maxS + 2 ? 'hạn chế' : 'không phù hợp');
        return { name: c.n, salinity_ok: ok, note: c.note, price: null };
      });
      o.innerHTML = '<div style="display:grid;gap:8px">' + arr.map(function (c) {
        var col = c.salinity_ok === 'tốt' ? '#00c853' : (c.salinity_ok === 'hạn chế' ? '#ff9800' : '#ef5350');
        var tag = c.salinity_ok === 'tốt' ? '✔ PHÙ HỢP' : (c.salinity_ok === 'hạn chế' ? '🔶 HẠN CHẾ' : '❌ KHÔNG PHÙ HỢP');
        return '<div style="background:#131c31;border:1px solid ' + col + '66;border-radius:10px;padding:12px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div style="font-size:12px;font-weight:700;color:#e8eaf6">' + esc(c.name) + '</div>' +
          '<span style="background:' + col + '22;color:' + col + ';border:1px solid ' + col + '66;border-radius:6px;padding:2px 8px;font-size:9px;font-weight:700;white-space:nowrap">' + tag + '</span></div>' +
          '<div style="font-size:10px;color:#90a4ae;margin-top:6px;line-height:1.5">' + esc(c.note) + '</div>' +
          (c.price ? '<div style="font-size:11px;color:#00e676;margin-top:6px">💰 ' + esc(c.price) + '</div>' : '') + '</div>';
      }).join('') + '</div>' +
        '<div style="margin-top:10px;font-size:9px;color:#607d8b">Gợi ý dựa trên độ mặn hiện tại ' + s + '‰ — kết hợp dữ liệu trạm quan trắc + giá thị trường.</div>';
    }).catch(function () { o.innerHTML = '<div style="color:#f44336;font-size:11px;text-align:center;padding:30px">Lỗi kết nối</div>'; });
  }

  /* ============ 5. HỒ SƠ NÔNG DÂN (nâng cấp) ============ */
  function fpRender(p) {
    var u = getU();
    if (!u) return cb();
    var uu = (window.getU && window.getU()) || [];
    var r = uu.find ? uu.find(function (x) { return x.email === u.email; }) : null;
    var av = (r && r.avatar) || u.avatar || '';
    return '<div class="pt">👨‍🌾 Hồ sơ nông dân</div><div class="ps">DANH ĐẠT (SÓI CÔ ĐỘC) — hồ sơ canh tác chuyên sâu (v' + V + ')</div>' +
      '<div style="background:#131c31;border:1px solid #1e2d4a;border-radius:10px;padding:14px;margin-bottom:12px;text-align:center">' +
      '<div style="width:72px;height:72px;margin:0 auto 8px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#ff6d00,#ff1744);display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;font-weight:700">' +
      (av ? '<img src="' + esc(av) + '" style="width:100%;height:100%;object-fit:cover">' : esc((u.name || 'N')[0].toUpperCase())) + '</div>' +
      '<div style="font-size:14px;font-weight:700;color:#e8eaf6">' + esc(u.name) + '</div>' +
      '<div style="font-size:10px;color:#607d8b">' + esc(u.email) + '</div>' +
      '<div style="margin-top:8px"><button class="btn bs" onclick="document.getElementById(\'fpAvatar\').click()">📷 Đổi ảnh đại diện</button>' +
      '<input id="fpAvatar" type="file" accept="image/*" style="display:none" onchange="MES_V114.fpAvatar(this)"></div></div>' +
      '<div style="display:grid;gap:8px;margin-bottom:12px">' +
      '<textarea id="fpBio" placeholder="Mô tả trang trại (vd: Trồng lúa ST25 2ha, nuôi tôm thẻ kết hợp...)" style="width:100%;box-sizing:border-box;min-height:64px;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' + esc((r && r.farm_bio) || u.farm_bio || '') + '</textarea>' +
      '<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">' +
      '<input id="fpArea" type="number" step="0.1" min="0" placeholder="Diện tích canh tác" value="' + esc((r && r.farm_area) || u.farm_area || 0) + '" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '<select id="fpUnit" style="background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' + ['ha', 'sào', 'm2'].map(function (x) { var v = ((r && r.farm_unit) || u.farm_unit || 'ha'); return '<option' + (x === v ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<input id="fpCrops" placeholder="Cây trồng chính (vd: lúa, tôm, mãng cầu)" value="' + esc((r && r.farm_crops) || u.farm_crops || '') + '" style="width:100%;box-sizing:border-box;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px">' +
      '<select id="fpRegion" style="background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px"><option value="">— Vùng miền —</option>' + PROVINCES.map(function (x) { var c = ((r && r.farm_region) || u.farm_region || ''); return '<option' + (x.n === c ? ' selected' : '') + '>' + x.n + '</option>'; }).join('') + '</select>' +
      '</div>' +
      '<button class="btn bp" style="width:100%" onclick="MES_V114.fpSave()">💾 Lưu hồ sơ</button><div style="height:8px"></div>' + cb();
  }
  function fpAvatar(inp) {
    var f = inp.files && inp.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function (e) {
      var img = e.target.result;
      var canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
      var ctx = canvas.getContext('2d'); var im = new Image();
      im.onload = function () { ctx.drawImage(im, 0, 0, 128, 128); localStorage.setItem('mes_avatar', canvas.toDataURL('image/jpeg', 0.7)); toast('📷 Ảnh xong', 'Bấm Lưu hồ sơ để cập nhật'); };
      im.src = img;
    };
    rd.readAsDataURL(f);
  }
  function fpSave() {
    var u = getU(); if (!u) { toast('❌ Chưa đăng nhập', 'Vui lòng đăng nhập'); return; }
    var avatar = localStorage.getItem('mes_avatar') || '';
    var b = { email: u.email, avatar: avatar, farm_bio: document.getElementById('fpBio').value, farm_area: Number(document.getElementById('fpArea').value) || 0, farm_crops: document.getElementById('fpCrops').value, farm_region: document.getElementById('fpRegion').value, farm_unit: document.getElementById('fpUnit').value };
    fetch((window.API_BASE || '/api') + '/profile/farm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.ok) { toast('✅ Đã lưu hồ sơ', 'Cập nhật thành công'); try { localStorage.removeItem('mes_avatar'); } catch (e) {} }
        else { toast('❌ Lỗi', (d && d.error) || 'Không lưu được'); }
      }).catch(function () { toast('❌ Lỗi', 'Mất kết nối server'); });
  }

  /* ============ 6. XUẤT BÁO CÁO PDF ============ */
  function exportPDF() {
    var u = getU(); var name = u ? (u.name || 'Nông dân') : 'Nông dân';
    var wl = window.LS ? window.LS.get((window.KS || 'mes_') + 'wallet', { balance: 0, history: [] }) : { balance: 0, history: [] };
    var inv = window.LS ? window.LS.get((window.KS || 'mes_') + 'inventory', []) : [];
    var nft = window.LS ? window.LS.get((window.KS || 'mes_') + 'nft', []) : [];
    var now = new Date().toLocaleString('vi-VN');
    var w = window.open('', '_blank');
    if (!w) { toast('⚠️ Chặn popup', 'Cho phép popup để xuất PDF'); return; }
    w.document.write('<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Báo cáo MEKONG ECO-SHIELD</title>' +
      '<style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;color:#0d6e3b;border-bottom:2px solid #0d6e3b;padding-bottom:4px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}td,th{border:1px solid #ccc;padding:6px 8px;font-size:12px;text-align:left}th{background:#eef7f0}.muted{color:#777;font-size:12px}.box{border:1px solid #ccc;border-radius:8px;padding:12px;margin-top:8px}</style></head><body>' +
      '<h1>🌊 MEKONG ECO-SHIELD AI</h1><div class="muted">DANH ĐẠT (SÓI CÔ ĐỘC) — Báo cáo nông dân · ' + esc(name) + ' · ' + esc(u ? u.email : '') + '</div><div class="muted">Xuất lúc: ' + esc(now) + '</div>' +
      '<h2>💰 Tài chính (Ví MES-CASH)</h2><div class="box">Số dư: <b>' + esc(wl.balance || 0) + ' đ</b> · ' + ((wl.history || []).length) + ' giao dịch</div>' +
      '<h2>📦 Kho vật tư</h2><table><tr><th>Vật tư</th><th>Số lượng</th><th>Đơn vị</th></tr>' + (inv.map(function (x) { return '<tr><td>' + esc(x.name || x.item || '') + '</td><td>' + esc(x.qty || x.quantity || 0) + '</td><td>' + esc(x.unit || '') + '</td></tr>'; }).join('') || '<tr><td colspan="3">Chưa có dữ liệu</td></tr>') + '</table>' +
      '<h2>🏅 Thành tích</h2><div class="box">' + nft.length + ' huy hiệu đã đạt được</div>' +
      '<h2>⚠️ Lưu ý</h2><div class="box">Báo cáo được xuất từ nền tảng MEKONG ECO-SHIELD v' + V + ' — dữ liệu thời điểm xuất bản. Dùng phím Ctrl+P (hoặc Print) để lưu thành PDF.</div>' +
      '</body></html>');
    w.document.close();
    setTimeout(function () { w.focus(); w.print(); }, 300);
  }

  /* ============ 7. GDACS REAL-TIME ============ */
  function gdRender(p) {
    var u = getU();
    if (!u) return cb();
    return '<div class="pt">🛰️ GDACS Real-time</div><div class="ps">Cảnh báo thiên tai toàn cầu (GDACS) — xoáy thuận & lũ</div>' +
      '<div style="margin-bottom:12px"><button class="btn bp" onclick="MES_V114.loadGD()">🔄 Cập nhật tin GDACS</button> <button class="btn bs" onclick="MES_V114.mockAlert(\'yellow\')">🟡 Mô phỏng Vàng</button> <button class="btn bs" onclick="MES_V114.mockAlert(\'orange\')">🟠 Mô phỏng Cam</button> <button class="btn bs" onclick="MES_V114.mockAlert(\'red\')">🔴 Mô phỏng Đỏ</button></div>' +
      '<div id="gdList"><div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Đang tải tin GDACS...</div></div>' + cb();
  }
  function loadGD() {
    var el = document.getElementById('gdList'); if (!el) return;
    fetch((window.API_BASE || '/api') + '/gdacs').then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) { el.innerHTML = '<div style="color:#f44336;font-size:11px;text-align:center;padding:30px">Không tải được GDACS</div>'; return; }
      var ev = d.events || [];
      if (!ev.length) { el.innerHTML = '<div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Không có sự kiện TC/FL đang hoạt động</div>'; return; }
      var ll = getLatLon();
      var cards = ev.map(function (e) {
        var lvl = (e.alertlevel || 'Green').toLowerCase().indexOf('red') >= 0 ? 'red' : ((e.alertlevel || 'Green').toLowerCase().indexOf('orange') >= 0 ? 'orange' : 'green');
        var c = LEVEL_COLOR[lvl]; var icon = e.eventtype === 'TC' ? '🌀' : '🌊';
        var km = haversineKm(ll.lat, ll.lon, Number(e.lat) || 0, Number(e.lon) || 0);
        var isUrgent = (lvl === 'orange' || lvl === 'red') && km < 150 ? ' <span style="background:rgba(211,47,47,.2);color:#ff8a80;border-radius:6px;padding:2px 8px;font-size:9px;font-weight:700">⚠ CÁCH BẠN ' + km + ' KM</span>' : '';
        return '<div style="background:#131c31;border:1px solid ' + c + '66;border-left:4px solid ' + c + ';border-radius:10px;padding:12px;margin-bottom:8px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<div style="font-size:12px;font-weight:700;color:#e8eaf6">' + icon + ' ' + esc(e.title) + '</div>' +
          '<span style="background:' + c + '22;color:' + c + ';border:1px solid ' + c + '66;border-radius:6px;padding:2px 10px;font-size:9px;font-weight:700;white-space:nowrap">' + esc(e.alertlevel || 'Green') + '</span></div>' +
          '<div style="font-size:9px;color:#90a4ae;margin-top:6px">Loại: ' + (e.eventtype === 'TC' ? 'Xoáy thuận' : 'Lũ') + ' · Scale: ' + esc(e.scale || '—') + ' · ' + esc((e.from_date || '').slice(0, 10)) + ' → ' + esc((e.to_date || '').slice(0, 10)) + '</div>' +
          (e.description ? '<div style="font-size:10px;color:#b0bec5;margin-top:6px;line-height:1.5">' + esc(e.description.length > 130 ? e.description.slice(0, 130) + '…' : e.description) + '</div>' : '') +
          '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<button class="btn bs" style="padding:5px 10px;font-size:10px" onclick="MES_V114.dist(' + (e.lat || 0) + ',' + (e.lon || 0) + ')">📍 Khoảng cách</button>' +
          '<span id="gdDist" style="font-size:10px;color:#80d8ff">Cách bạn ' + km + ' km</span>' + isUrgent + '</div></div>';
      }).join('');
      el.innerHTML = (d.demo ? '<div style="background:rgba(255,193,7,.12);border:1px solid #ffc10755;color:#ffd54f;font-size:10px;border-radius:8px;padding:8px;margin-bottom:8px">ℹ️ Nguồn GDACS tạm không truy cập được — dữ liệu thử nghiệm mô phỏng</div>' : '') + cards;
    }).catch(function () { el.innerHTML = '<div style="color:#f44336;font-size:11px;text-align:center;padding:30px">Lỗi kết nối</div>'; });
  }
  function dist(lat, lon) { var ll = getLatLon(); toast('📍 Khoảng cách', 'Sự kiện cách bạn ' + haversineKm(ll.lat, ll.lon, Number(lat), Number(lon)) + ' km'); }

  /* ============ 8. MÀN HÌNH CẢNH BÁO 3 GIÂY ============ */
  function showAlertScreen(level, title, km) {
    var chk = CHECKLISTS[level] || CHECKLISTS.yellow;
    var c = LEVEL_COLOR[level] || '#ffc107', ic = LEVEL_ICON[level] || '⚠️';
    var top = '<div style="font-size:34px">' + ic + '</div>' +
      '<div style="font-size:16px;font-weight:800;color:#fff;margin-top:4px">' + esc(title || 'CẢNH BÁO THIÊN TAI') + '</div>' +
      (km != null ? '<div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:6px">📍 KHOẢNG CÁCH: ' + km + ' km</div>' : '');
    var body = chk.map(function (x, i) {
      return '<label style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:12px;cursor:pointer">' +
        '<input type="checkbox" style="width:18px;height:18px;accent-color:#fff;flex-shrink:0">' +
        '<span style="font-size:12px;color:#fff;font-weight:600">' + esc(x) + '</span></label>';
    }).join('');
    var footer = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">' +
      '<button id="asSafe" style="background:#00c853;border:none;color:#fff;font-weight:800;border-radius:12px;padding:14px;font-size:13px;cursor:pointer">🟢 Tôi đang an toàn</button>' +
      '<button id="asDanger" style="background:#d32f2f;border:none;color:#fff;font-weight:800;border-radius:12px;padding:14px;font-size:13px;cursor:pointer">🔴 Báo cáo nguy hiểm</button></div>';
    var ov = document.createElement('div');
    ov.id = 'mesAlertScreen';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:' + c + ';display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML = '<div style="width:100%;max-width:420px;max-height:92vh;overflow-y:auto">' + top + '<div style="display:grid;gap:8px;margin-top:14px">' + body + '</div>' + footer + '</div>';
    document.body.appendChild(ov);
    document.getElementById('asSafe').addEventListener('click', function () {
      ov.remove();
      toast('✅ Đã ghi nhận', 'Bạn an toàn — cảm ơn đã xác nhận');
      try { navigator.vibrate && navigator.vibrate(80); } catch (e) {}
    });
    document.getElementById('asDanger').addEventListener('click', function () { ov.remove(); openCrowdModal(true); });
  }
  function mockAlert(lvl) {
    var titles = { yellow: 'CẢNH BÁO MỰC NƯỚC DÂNG (CẤP VÀNG)', orange: 'CẢNH BÁO LŨ TIẾP CẬN (CẤP CAM)', red: 'CẢNH BÁO KHẨN CẤP LŨ LỚN (CẤP ĐỎ)' };
    var kms = { yellow: 120, orange: 45, red: 12 };
    showAlertScreen(lvl, titles[lvl], kms[lvl]);
  }

  /* ============ 9. CROWD CLUSTER AI ============ */
  function crRender(p) {
    var u = getU();
    if (!u) return cb();
    var ll = getLatLon();
    return '<div class="pt">🧑‍🤝‍🧑 Báo cáo cộng đồng</div><div class="ps">AI gom cụm báo cáo — ≥5 báo cáo cùng khu vực = xác nhận hiện trường</div>' +
      '<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn bp" onclick="MES_V114.openCrowdModal(true)">🔴 Báo cáo nguy hiểm (GPS)</button>' +
      '<button class="btn bs" onclick="MES_V114.loadCrowd()">🔄 Cập nhật</button></div>' +
      '<div id="crOut"><div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Đang tải báo cáo cộng đồng...</div></div>' + cb();
  }
  function loadCrowd() {
    var el = document.getElementById('crOut'); if (!el) return;
    var ll = getLatLon();
    fetch((window.API_BASE || '/api') + '/crowd?lat=' + ll.lat + '&lon=' + ll.lon).then(function (r) { return r.json(); }).then(function (d) {
      var reps = (d && d.ok && d.reports) ? d.reports : [];
      if (!reps.length) { el.innerHTML = '<div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Chưa có báo cáo cộng đồng</div>'; return; }
      var IC = { flood: '🌊', landslide: '⛰️', house: '🏚️', stuck: '🆘', other: '❗' };
      el.innerHTML = reps.map(function (r) {
        var ic = IC[r.type] || '❗';
        var cl = r.cluster_key ? '<span style="background:#26a69a22;color:#26c6da;border-radius:6px;padding:2px 8px;font-size:9px">🔗 Cụm ' + esc(r.cluster_key) + ' · ' + (Number(r.cluster_count) || 1) + ' báo cáo</span>' : '';
        var ok = r.confirmed ? '<span style="background:#00c85322;color:#69f0ae;border-radius:6px;padding:2px 8px;font-size:9px;font-weight:700">✔ ĐÃ XÁC NHẬN (≥5 báo cáo)</span>' : '';
        return '<div style="background:#131c31;border:1px solid #1e2d4a;border-radius:10px;padding:12px;margin-bottom:8px">' +
          '<div style="display:flex;gap:8px;align-items:flex-start"><div style="font-size:20px">' + ic + '</div>' +
          '<div style="flex:1"><div style="font-size:11px;font-weight:700;color:#e8eaf6">' + esc(r.full_name || r.email || 'Ẩn danh') + '</div>' +
          '<div style="font-size:10px;color:#90a4ae;margin-top:3px;line-height:1.5">' + esc(r.content) + '</div>' +
          '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">' + cl + ok + '</div></div></div></div>';
      }).join('');
    }).catch(function () { el.innerHTML = '<div style="color:#f44336;font-size:11px;text-align:center;padding:30px">Lỗi tải báo cáo</div>'; });
  }
  function openCrowdModal(useGps) {
    var m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML = '<div style="background:#0d1526;border:1px solid #1e2d4a;border-radius:12px;padding:16px;width:100%;max-width:380px;max-height:90vh;overflow-y:auto">' +
      '<div style="font-size:14px;font-weight:700;color:#ef5350;margin-bottom:12px">🔴 Báo cáo nguy hiểm</div>' +
      '<div style="display:grid;gap:8px">' +
      '<select id="crType" style="background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px"><option value="flood">🌊 Lũ ứ đọng</option><option value="landslide">⛰️ Sạt lở</option><option value="house">🏚️ Nhà hư hại</option><option value="stuck">🆘 Người mắc kẹt</option><option value="other">❗ Khác</option></select>' +
      '<textarea id="crContent" placeholder="Mô tả hiện trường (vd: Nước ngập 0.5m, đường Trần Phú...)" style="width:100%;box-sizing:border-box;min-height:80px;background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px"></textarea>' +
      '<label style="font-size:11px;color:#90a4ae;display:flex;gap:6px;align-items:center"><input id="crGps" type="checkbox" checked> Dùng GPS của tôi</label></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">' +
      '<button class="btn bs" onclick="this.closest(\'div\').parentNode.remove()">Hủy</button>' +
      '<button class="btn bp" onclick="MES_V114.submitCrowd()">Gửi báo cáo</button></div></div>';
    document.body.appendChild(m);
  }
  function submitCrowd() {
    var u = getU();
    var type = document.getElementById('crType').value;
    var content = document.getElementById('crContent').value;
    if (!content) { toast('⚠️ Nội dung', 'Nhập mô tả hiện trường'); return; }
    var useGps = document.getElementById('crGps').checked;
    var modals = document.querySelectorAll('div[style*="9998"]');
    modals.forEach(function (x) { x.remove(); });
    var doSend = function (lat, lon) {
      saveLL(lat, lon);
      var rep = { email: u ? u.email : 'khach', full_name: u ? (u.name || '') : 'Nông dân', lat: lat, lon: lon, type: type, content: content };
      if (dbSave(rep)) return;
      fetch((window.API_BASE || '/api') + '/crowd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rep) })
        .then(function (r) { return r.json(); }).then(function (d) {
          if (d && d.ok) {
            var msg = d.confirmed ? '✔ ĐÃ XÁC NHẬN — cụm ' + d.cluster_key + ' đủ ' + d.cluster_count + ' báo cáo' : 'Đã vào cụm ' + d.cluster_key + ' (' + d.cluster_count + ' báo cáo)';
            toast(d.confirmed ? '🚨 Xác nhận hiện trường' : '✅ Đã gửi', msg);
          } else { toast('❌ Lỗi', (d && d.error) || 'Không gửi được'); }
        }).catch(function () { toast('❌ Lỗi', 'Mất kết nối — báo cáo chưa gửi'); });
    };
    if (useGps && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (p) { doSend(p.coords.latitude, p.coords.longitude); },
        function () { var ll = getLatLon(); toast('📍 Không lấy được GPS', 'Dùng tọa độ gần nhất'); doSend(ll.lat, ll.lon); },
        { timeout: 8000, enableHighAccuracy: true });
    } else { var ll = getLatLon(); doSend(ll.lat, ll.lon); }
  }

  /* ============ 10. ĐỊNH LƯỢNG RỦI RO ============ */
  function rqRender(p) {
    var u = getU();
    if (!u) return cb();
    var opts = PROVINCES.map(function (x) { return '<option value="' + x.lat + ',' + x.lon + '">' + x.n + '</option>'; }).join('');
    return '<div class="pt">🎯 Định lượng rủi ro</div><div class="ps">Đánh giá rủi ro tài sản & hoa màu theo mức lũ + độ mặn</div>' +
      '<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:12px">' +
      '<select id="rqType" style="background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px"><option value="house">🏠 Nhà ở</option><option value="crop">🌾 Hoa màu</option></select>' +
      '<select id="rqProv" style="background:#0b1120;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px;font-size:12px"><option value="">— Chọn tỉnh —</option>' + opts + '</select>' +
      '<button class="btn bp" onclick="MES_V114.calcRisk()">🧮 Tính rủi ro</button></div>' +
      '<div id="rqOut"></div>' + cb();
  }
  function calcRisk() {
    var o = document.getElementById('rqOut'); if (!o) return;
    var pv = document.getElementById('rqProv').value;
    var type = document.getElementById('rqType').value;
    if (!pv) { toast('⚠️ Chọn tỉnh', 'Chọn tỉnh để tính rủi ro'); return; }
    var v = pv.split(',');
    o.innerHTML = '<div style="color:#607d8b;font-size:11px;text-align:center;padding:30px">Đang tính toán rủi ro...</div>';
    fetch((window.API_BASE || '/api') + '/risk?lat=' + v[0] + '&lon=' + v[1] + '&type=' + type).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) { o.innerHTML = '<div style="color:#f44336;font-size:11px;text-align:center;padding:30px">Không tính được rủi ro</div>'; return; }
      var lvl = d.level || 'green', c = LEVEL_COLOR[lvl] || '#00c853';
      var lvlVn = { green: 'THẤP', yellow: 'TRUNG BÌNH', orange: 'CAO', red: 'RẤT CAO' }[lvl] || 'THẤP';
      var chk = CHECKLISTS[lvl] || CHECKLISTS.yellow;
      var pname = pv ? PROVINCES.filter(function (x) { return (x.lat + ',' + x.lon) === pv; }).map(function (x) { return x.n; })[0] || '' : '';
      o.innerHTML = '<div style="background:#131c31;border:2px solid ' + c + ';border-radius:12px;padding:16px;text-align:center">' +
        '<div style="font-size:26px">' + LEVEL_ICON[lvl] + '</div>' +
        '<div style="font-size:12px;color:#607d8b;margin-top:4px">' + esc(pname) + ' — ' + (type === 'house' ? 'Nhà ở' : 'Hoa màu') + '</div>' +
        '<div style="font-size:18px;font-weight:800;color:' + c + ';margin-top:6px">MỨC RỦI RO: ' + lvlVn + ' (' + (Number(d.score) || 0) + '/100)</div>' +
        (d.hours ? '<div style="font-size:11px;color:#90a4ae;margin-top:4px">⏱ Thời gian khẩn cấp: ~' + esc(d.hours) + ' giờ</div>' : '') +
        (d.impact ? '<div style="font-size:11px;color:#b0bec5;margin-top:6px;line-height:1.5">' + esc(d.impact) + '</div>' : '') +
        '<div style="text-align:left;margin-top:12px;display:grid;gap:6px">' + chk.map(function (x) { return '<div style="background:rgba(0,0,0,.2);border:1px solid ' + c + '44;border-radius:8px;padding:8px 10px;font-size:11px;color:#e8eaf6">☑ ' + esc(x) + '</div>'; }).join('') + '</div>' +
        '<div style="margin-top:12px"><button class="btn bs" onclick="MES_V114.exportPDF()">📄 Xuất PDF báo cáo</button></div></div>';
    }).catch(function () { o.innerHTML = '<div style="color:#f44336;font-size:11px;text-align:center;padding:30px">Lỗi kết nối</div>'; });
  }

  /* ============ FAB MENU v114 ============ */
  function ensureFAB() {
    if (document.getElementById('mesFAB')) return;
    var fab = document.createElement('div');
    fab.id = 'mesFAB';
    fab.style.cssText = 'position:fixed;bottom:84px;right:16px;z-index:9996;display:flex;flex-direction:column;gap:8px;align-items:flex-end';
    fab.innerHTML = '<div id="mesFabPanel" style="display:none;flex-direction:column;gap:6px;background:#0d1526;border:1px solid #1e2d4a;border-radius:12px;padding:10px;box-shadow:0 6px 20px rgba(0,0,0,.5)">' +
      ['marketplace|🛒 Chợ (lọc & tìm)', 'forecast7d|🌤️ Dự báo 7 ngày', 'waterQ|💧 Chất lượng nước', 'cropSuggest|🌱 Gợi ý giống cây', 'farmProfile|👨‍🌾 Hồ sơ nông dân', 'gdacs|🛰️ GDACS', 'crowd|🧑‍🤝‍🧑 Báo cáo cộng đồng', 'riskQ|🎯 Định lượng rủi ro'].map(function (x) {
        var p = x.split('|');
        return '<button style="background:#131c31;border:1px solid #24344f;color:#e8eaf6;border-radius:8px;padding:9px 12px;font-size:12px;text-align:left;cursor:pointer" onclick="MES_V114.nav(\'' + p[0] + '\')">' + p[1] + '</button>';
      }).join('') +
      '<button style="background:#131c31;border:1px solid #24344f;color:#ffd54f;border-radius:8px;padding:9px 12px;font-size:12px;text-align:left;cursor:pointer" onclick="MES_V114.exportPDF()">📄 Xuất báo cáo PDF</button></div>' +
      '<button id="mesFabBtn" style="width:52px;height:52px;background:linear-gradient(135deg,#ff6d00,#ff1744);border:none;border-radius:50%;color:#fff;font-size:20px;cursor:pointer;box-shadow:0 4px 15px rgba(255,109,0,.4);animation:pulse-menu 2s infinite">✨</button>';
    document.body.appendChild(fab);
    document.getElementById('mesFabBtn').addEventListener('click', function () {
      var p = document.getElementById('mesFabPanel');
      p.style.display = p.style.display === 'none' ? 'flex' : 'none';
    });
  }
  function nav(id) {
    var p = document.getElementById('mesFabPanel'); if (p) p.style.display = 'none';
    if (window.navigate) window.navigate(id); else if (window.showPage) window.showPage(id);
  }

  /* ============ REGISTER PAGES ============ */
  var pages = {};
  pages.forecast7d = { title: '🌤️ Dự báo 7 ngày', render: fcRender };
  pages.waterQ = { title: '💧 Chất lượng nước', render: wqRender, init: function () { setTimeout(loadWQ, 150); } };
  pages.cropSuggest = { title: '🌱 Gợi ý giống cây', render: csRender };
  pages.farmProfile = { title: '👨‍🌾 Hồ sơ nông dân', render: fpRender };
  pages.gdacs = { title: '🛰️ GDACS', render: gdRender, init: function () { setTimeout(loadGD, 150); } };
  pages.crowd = { title: '🧑‍🤝‍🧑 Báo cáo cộng đồng', render: crRender, init: function () { setTimeout(loadCrowd, 150); } };
  pages.riskQ = { title: '🎯 Định lượng rủi ro', render: rqRender };

  Object.keys(pages).forEach(function (k) { window.PAGES[k] = pages[k]; });
  var menuItems = [
    { label: 'Dự báo 7 ngày', id: 'forecast7d', icon: '🌤️', roles: ['GOD', 'NONG_DAN', 'DOANH_NGHIEP', 'NHA_DAU_TU', 'NGUOI_DAN'] },
    { label: 'Chất lượng nước', id: 'waterQ', icon: '💧', roles: ['GOD', 'NONG_DAN'] },
    { label: 'Gợi ý giống cây', id: 'cropSuggest', icon: '🌱', roles: ['GOD', 'NONG_DAN'] },
    { label: 'Hồ sơ nông dân', id: 'farmProfile', icon: '👨‍🌾', roles: ['GOD', 'NONG_DAN'] },
    { label: 'GDACS', id: 'gdacs', icon: '🛰️', roles: ['GOD', 'NONG_DAN', 'NGUOI_DAN'] },
    { label: 'Báo cáo cộng đồng', id: 'crowd', icon: '🧑‍🤝‍🧑', roles: ['GOD', 'NONG_DAN', 'NGUOI_DAN'] },
    { label: 'Định lượng rủi ro', id: 'riskQ', icon: '🎯', roles: ['GOD', 'NONG_DAN'] }
  ];
  if (window.MENU) menuItems.forEach(function (m) { window.MENU.push(m); });
  if (window.MENU_GROUPS) {
    var grp = window.MENU_GROUPS.filter(function (g) { return g.id === 'sensing'; })[0];
    var ids = menuItems.map(function (m) { return m.id; });
    if (grp) grp.items = grp.items.concat(ids);
    else window.MENU_GROUPS.push({ id: 'v114', label: 'Nâng cấp v114', icon: '✨', items: ids });
  }

  window.MES_V114 = {
    V: V, PROVINCES: PROVINCES, forecast: forecast, loadWQ: loadWQ, newWQ: newWQ, submitWQ: submitWQ,
    csUseWQ: csUseWQ, suggest: suggest, fpAvatar: fpAvatar, fpSave: fpSave, exportPDF: exportPDF,
    loadGD: loadGD, dist: dist, showAlertScreen: showAlertScreen, mockAlert: mockAlert,
    openCrowdModal: openCrowdModal, submitCrowd: submitCrowd, loadCrowd: loadCrowd,
    calcRisk: calcRisk, nav: nav, flushQueue: flushQueue
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureFAB);
  else ensureFAB();
})();