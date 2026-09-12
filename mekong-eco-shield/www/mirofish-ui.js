/**
 * Mekong Eco-Shield — MiroFish Multi-Agent GraphRAG Bridge UI
 * Kích hoạt mô phỏng đa tác nhân ứng phó thiên tai ĐBSCL qua MiroFish.
 * Gọi endpoint /api/mirofish/* được proxy bởi _worker.js (fallback mock khi backend offline).
 */

(function() {
  const MIROFISH_API = '/api/mirofish';

  const PROVINCES = ['Kiên Giang', 'Bến Tre', 'Sóc Trăng', 'Cà Mau', 'An Giang', 'Đồng Tháp', 'Cần Thơ', 'Tiền Giang', 'Vĩnh Long', 'Long An', 'Trà Vinh', 'Bạc Liêu', 'Hậu Giang', 'Quảng Ninh', 'Hải Phòng', 'Thái Bình', 'Nam Định', 'Ninh Bình', 'Hà Nội', 'Đắk Lắk', 'Gia Lai', 'Kon Tum', 'Lào Cai', 'Hà Giang', 'Sơn La', 'Điện Biên', 'Quảng Nam', 'Thừa Thiên Huế', 'Bình Thuận', 'Ninh Thuận', 'Bình Phước'];

  const SCENARIOS = {
    'salinity_flood': { label: '🌊 Xâm nhập mặn + Lũ lụt', icon: '🌊', fields: ['salinity', 'floodTier'], defaults: { salinity: 4.2, floodTier: 3 } },
    'earthquake': { label: '🌍 Động đất', icon: '🌍', fields: ['magnitude', 'depth'], defaults: { magnitude: 5.5, depth: 10 } },
    'tsunami': { label: '🌊 Sóng thần', icon: '🌊', fields: ['magnitude', 'distance'], defaults: { magnitude: 7.5, distance: 200 } },
    'volcano': { label: '🌋 Núi lửa', icon: '🌋', fields: ['volcano', 'alertLevel'], defaults: { volcano: 'Chư Đrăng', alertLevel: 2 } },
    'landslide': { label: '⛰️ Sạt lở đất', icon: '⛰️', fields: ['rainfall', 'slope'], defaults: { rainfall: 200, slope: 35 } },
    'drought': { label: '☀️ Hạn hán', icon: '☀️', fields: ['spi', 'vhi'], defaults: { spi: -2.0, vhi: 25 } },
    'wildfire': { label: '🔥 Cháy rừng', icon: '🔥', fields: ['area', 'wind'], defaults: { area: 100, wind: 25 } },
    'storm_surge': { label: '🌀 Bão + Bão cồn', icon: '🌀', fields: ['category', 'tide'], defaults: { category: 3, tide: 2.5 } },
    'multi_hazard': { label: '⚡ Đa thiên tai (Kết hợp)', icon: '⚡', fields: ['hazards'], defaults: { hazards: 'storm,flood,landslide' } }
  };

  function generateMockData(p) {
    const province = p.province || 'Kiên Giang';
    const scenario = p.scenario || document.getElementById('mfScenario')?.value || 'salinity_flood';
    const s = SCENARIOS[scenario];
    const icon = s ? s.icon : '⚡';
    const sLabel = s ? s.label : scenario;
    let impactGrade = 2; let agents = []; let summary = ''; let rec = ''; let extraFields = '';

    if (scenario === 'salinity_flood') {
      const sal = p.salinity || 4.2; const ft = p.floodTier || 3;
      impactGrade = Math.max(sal >= 6 ? 4 : sal >= 4 ? 3 : sal >= 2 ? 2 : 1, ft);
      agents = [
        { agent_id: 'salinity', agent_name: 'Đại lý Xâm nhập Mặn', icon: '🌊', action: 'Phân tích mặn ' + sal + '‰ tại ' + province, priority: sal >= 4 ? 'Cao' : 'Thấp', actions: sal >= 4 ? ['Kiểm tra đê chắn mặn sông ' + province, 'Bật trạm bơm nước ngọt', 'Cảnh báo nông dân'] : ['Giám sát trạm ' + province] },
        { agent_id: 'flood', agent_name: 'Đại lý Lũ lụt', icon: '🌧️', action: 'Cấp lũ ' + ft + ' tại ' + province, priority: ft >= 3 ? 'Cao' : 'Thấp', actions: ft >= 3 ? ['Kiểm tra đê điều', 'Sơ tán vùng ngập', 'Chuẩn bị lương thực'] : ['Theo dõi mực nước'] },
        { agent_id: 'agri', agent_name: 'Đại lý Nông nghiệp', icon: '🌱', action: 'Đánh giá mùa vụ', priority: impactGrade >= 3 ? 'Cao' : 'Trung bình', actions: ['Kiểm tra đất canh tác', 'Đề xuất giống chống chịu'] },
        { agent_id: 'logistics', agent_name: 'Đại lý Hậu cần', icon: '🚚', action: 'Tối ưu tuyến di chuyển', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Tuyến đường an toàn', 'Phân bổ nguồn lực'] },
        { agent_id: 'satellite', agent_name: 'Đại lý Vệ tinh', icon: '🛰️', action: 'Giám sát mặn từ không gian', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Tải ảnh SAR mới nhất', 'Đo độ mặn bề mặt qua vệ tinh', 'Cảnh báo sớm xâm nhập'] }
      ];
      summary = province + ' — mặn ' + sal + '‰, lũ cấp ' + ft + '. ' + (impactGrade >= 3 ? 'Nghiêm trọng!' : 'Đang theo dõi.');
      extraFields = 'Mặn: ' + sal + '‰ · Lũ cấp ' + ft;
    } else if (scenario === 'earthquake') {
      const mag = p.magnitude || 5.5; const dep = p.depth || 10;
      impactGrade = mag >= 7 ? 4 : mag >= 6 ? 3 : mag >= 5 ? 2 : 1;
      agents = [
        { agent_id: 'seismic', agent_name: 'Đại lý Địa chấn', icon: '🌍', action: 'M5.' + mag.toFixed(1) + ' sâu ' + dep + 'km tại ' + province, priority: impactGrade >= 3 ? 'Cao' : 'Trung bình', actions: impactGrade >= 3 ? ['Cảnh báo aftershock', 'Kiểm tra cầu cống', 'Sơ tán khu vực yếu'] : ['Ghi nhận rung chấn', 'Theo dõi aftershock'] },
        { agent_id: 'structural', agent_name: 'Đại lý Công trình', icon: '🏗️', action: 'Đánh giá sạt lở công trình', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Kiểm tra tòa nhà cao tầng', 'Phong tỏa khu vực nguy hiểm', 'Đánh giá thiệt hại'] },
        { agent_id: 'medical', agent_name: 'Đại lý Y tế', icon: '🏥', action: 'Chuẩn bị ứng cứu y tế', priority: impactGrade >= 3 ? 'Cao' : 'Trung bình', actions: ['Kích hoạt bệnh viện dã chiến', 'Chuẩn bị máu & thuốc'] },
        { agent_id: 'logistics', agent_name: 'Đại lý Hậu cần', icon: '🚚', action: 'Di chuyển lực lượng', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Mở tuyến cứu hộ', 'Phân bổ lều trại'] }
      ];
      summary = province + ' — động đất M' + mag.toFixed(1) + ', sâu ' + dep + 'km. ' + (impactGrade >= 3 ? 'Nguy hiểm!' : 'Rung chấn nhẹ.');
      extraFields = 'M' + mag.toFixed(1) + ' · Sâu ' + dep + 'km';
    } else if (scenario === 'tsunami') {
      const mag = p.magnitude || 7.5; const dist = p.distance || 200;
      impactGrade = mag >= 8 ? 4 : mag >= 7.5 ? 3 : mag >= 7 ? 2 : 1;
      agents = [
        { agent_id: 'ocean', agent_name: 'Đại lý Đại dương', icon: '🌊', action: 'Sóng thần từ M' + mag.toFixed(1) + ', cách ' + dist + 'km', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: impactGrade >= 3 ? ['Cảnh báo sóng thần ngay!', 'Sơ tán vùng ven biển 3km', 'Kích hoạt hệ thống còi hú'] : ['Theo dõi mực nước biển'] },
        { agent_id: 'evac', agent_name: 'Đại lý Sơ tán', icon: '🏃', action: 'Tổ chức sơ tán', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Mở tuyến sơ tán lên núi', 'Điểm tập trung an toàn'] },
        { agent_id: 'coastal', agent_name: 'Đại lý ven biển', icon: '🏖️', action: 'Bảo vệ khu du lịch', priority: impactGrade >= 3 ? 'Cao' : 'Trung bình', actions: ['Thông báo resort/khách sạn', 'Đóng cửa bãi tắm'] },
        { agent_id: 'logistics', agent_name: 'Đại lý Hậu cần', icon: '🚚', action: 'Hỗ trợ di dời', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Điều phối xe buýt', 'Phân phát nhu yếu phẩm'] }
      ];
      summary = province + ' — sóng thần từ M' + mag.toFixed(1) + ', khoảng cách ' + dist + 'km. ' + (impactGrade >= 3 ? 'CẦN SƠ TÁN NGAY!' : 'Cảnh báo sóng thần.');
      extraFields = 'M' + mag.toFixed(1) + ' · ' + dist + 'km';
    } else if (scenario === 'volcano') {
      const v = p.volcano || 'Chư Đrăng'; const al = p.alertLevel || 2;
      impactGrade = al >= 4 ? 4 : al >= 3 ? 3 : al >= 2 ? 2 : 1;
      agents = [
        { agent_id: 'volcano', agent_name: 'Đại lý Núi lửa', icon: '🌋', action: v + ' — cấp cảnh báo ' + al, priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: impactGrade >= 3 ? ['Sơ tán bán kính 10km', 'Phong tỏa vùng nguy hiểm', 'Cảnh báo tro bụi'] : ['Giám sát actividad', 'Cảnh báo nhỏ'] },
        { agent_id: 'air', agent_name: 'Đại lý Không khí', icon: '💨', action: 'Đánh giá tro bụi', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Đo nồng độ SO2', 'Cảnh báo hàng không'] },
        { agent_id: 'agri', agent_name: 'Đại lý Nông nghiệp', icon: '🌱', action: 'Bảo vệ mùa màng', priority: impactGrade >= 3 ? 'Cao' : 'Trung bình', actions: ['Che phủ rau màu', 'Tưới rửa tro'] },
        { agent_id: 'logistics', agent_name: 'Đại lý Hậu cần', icon: '🚚', action: 'Hỗ trợ sơ tán', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Xe sơ tán', 'Trại tị nạn'] }
      ];
      summary = v + ' — cấp cảnh báo ' + al + '. ' + (impactGrade >= 3 ? 'NÚI LỬA ĐANG TIẾP CẬN PHUN TRÀO!' : 'Hoạt động bất thường.');
      extraFields = v + ' · Cấp ' + al;
    } else if (scenario === 'landslide') {
      const rain = p.rainfall || 200; const slope = p.slope || 35;
      impactGrade = rain >= 300 || slope >= 45 ? 4 : rain >= 200 || slope >= 35 ? 3 : rain >= 100 ? 2 : 1;
      agents = [
        { agent_id: 'ground', agent_name: 'Đại lý Địa chất', icon: '⛰️', action: 'Mưa ' + rain + 'mm/72h, dốc ' + slope + '°', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: impactGrade >= 3 ? ['Cảnh báo sạt lở!', 'Sơ tán nhà ven taluy', 'Phong tỏa đường'] : ['Kiểm tra điểm xung yếu'] },
        { agent_id: 'hydro', agent_name: 'Đại lý Thủy văn', icon: '💧', action: 'Dự báo dòng chảy', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Kiểm tra đập', 'Dự báo lũ quét'] },
        { agent_id: 'transport', agent_name: 'Đại lý Giao thông', icon: '🛣️', action: 'Đánh giá đường sá', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Phong tỏa QL bị sạt', 'Mở tuyến tránh'] },
        { agent_id: 'medical', agent_name: 'Đại lý Y tế', icon: '🏥', action: 'Chuẩn bị cứu hộ', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Xe cứu thương', 'Bệnh viện dã chiến'] }
      ];
      summary = province + ' — nguy cơ sạt lở ' + (impactGrade >= 3 ? 'CAO' : 'trung bình') + '. Mưa ' + rain + 'mm/72h, dốc ' + slope + '°.';
      extraFields = 'Mưa ' + rain + 'mm · Dốc ' + slope + '°';
    } else if (scenario === 'drought') {
      const spi = p.spi || -2.0; const vhi = p.vhi || 25;
      impactGrade = spi <= -2.5 || vhi <= 15 ? 4 : spi <= -2 || vhi <= 25 ? 3 : spi <= -1.5 ? 2 : 1;
      agents = [
        { agent_id: 'water', agent_name: 'Đại lý Thủy lợi', icon: '💧', action: 'SPI ' + spi.toFixed(1) + ', VHI ' + vhi, priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: impactGrade >= 3 ? ['Giảm tưới 50%', 'Ủy quyền xả hồ', 'Cấp nước sinh hoạt'] : ['Theo dõi chỉ số'] },
        { agent_id: 'agri', agent_name: 'Đại lý Nông nghiệp', icon: '🌱', action: 'Đánh giá mùa vụ', priority: impactGrade >= 3 ? 'Cao' : 'Trung bình', actions: ['Chuyển đổi cây trồng', 'Bỏ vụ'] },
        { agent_id: 'social', agent_name: 'Đại lý Xã hội', icon: '👥', action: 'Hỗ trợ nông dân', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Miễn thuế', 'Cho vay ưu đãi'] },
        { agent_id: 'logistics', agent_name: 'Đại lý Hậu cần', icon: '🚚', action: 'Vận chuyển nước', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Xe bồn cấp nước', 'Kho dự trữ'] }
      ];
      summary = province + ' — hạn hán nghiêm trọng. SPI ' + spi.toFixed(1) + ', VHI ' + vhi + '. ' + (impactGrade >= 3 ? 'Cấp nước khẩn cấp!' : 'Theo dõi.');
      extraFields = 'SPI ' + spi.toFixed(1) + ' · VHI ' + vhi;
    } else if (scenario === 'wildfire') {
      const area = p.area || 100; const wind = p.wind || 25;
      impactGrade = area >= 500 || wind >= 40 ? 4 : area >= 200 || wind >= 30 ? 3 : area >= 50 ? 2 : 1;
      agents = [
        { agent_id: 'fire', agent_name: 'Đại lý Cháy rừng', icon: '🔥', action: 'Diện tích ' + area + 'ha, gió ' + wind + 'km/h', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: impactGrade >= 3 ? ['Triển khai 100 lính cứu hỏa', 'Phun nước cơ giới', 'Tạo đường lửa'] : ['Ghi nhận hotspot'] },
        { agent_id: 'eco', agent_name: 'Đại lý Sinh thái', icon: '🌳', action: 'Đánh giá hệ sinh thái', priority: impactGrade >= 3 ? 'Cao' : 'Trung bình', actions: ['Bảo tồn loài quý hiếm', 'Dự phòng phục hồi'] },
        { agent_id: 'health', agent_name: 'Đại lý Sức khỏe', icon: '🫁', action: 'Chống khói bụi', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Phát khẩu trang', 'Trạm y tế lưu động'] },
        { agent_id: 'logistics', agent_name: 'Đại lý Hậu cần', icon: '🚚', action: 'Hỗ trợ', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Xe tăng phe', 'Nước uống'] }
      ];
      summary = province + ' — cháy rừng ' + area + 'ha, gió ' + wind + 'km/h. ' + (impactGrade >= 3 ? 'NGUY HIỂM!' : 'Đang kiểm soát.');
      extraFields = area + 'ha · Gió ' + wind + 'km/h';
    } else if (scenario === 'storm_surge') {
      const cat = p.category || 3; const tide = p.tide || 2.5;
      impactGrade = cat >= 5 || tide >= 3.5 ? 4 : cat >= 4 || tide >= 3 ? 3 : cat >= 3 ? 2 : 1;
      agents = [
        { agent_id: 'storm', agent_name: 'Đại lý Bão', icon: '🌀', action: 'Bão cấp ' + cat + ', bão cồn ' + tide + 'm', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: impactGrade >= 3 ? ['Cảnh báo bão cấp ' + cat, 'Sơ tán vùng ven biển', 'Cấm ra khơi'] : ['Theo dõi bão'] },
        { agent_id: 'marine', agent_name: 'Đại lý Hàng hải', icon: '🚢', action: 'Đánh giá tàu thuyền', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Triệu hồi tàu', 'Neo đậu an toàn'] },
        { agent_id: 'coastal', agent_name: 'Đại lý ven biển', icon: '🏖️', action: 'Bảo vệ bờ biển', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Chống xói lở', 'Gião cát'] },
        { agent_id: 'logistics', agent_name: 'Đại lý Hậu cần', icon: '🚚', action: 'Hỗ trợ', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Dự trữ lương thực', 'Xe sơ tán'] },
        { agent_id: 'satellite', agent_name: 'Đại lý Vệ tinh', icon: '🛰️', action: 'Theo dõi mắt bão qua vệ tinh', priority: impactGrade >= 3 ? 'Cao' : 'Thấp', actions: ['Vẽ quỹ đạo bão', 'Cập nhật tốc độ gió', 'Dự báo điểm đổ bộ'] }
      ];
      summary = province + ' — bão cấp ' + cat + ', bão cồn ' + tide + 'm. ' + (impactGrade >= 3 ? 'CỰC KỲ NGUY HIỂM!' : 'Cảnh báo.');
      extraFields = 'Cấp ' + cat + ' · ' + tide + 'm';
    } else if (scenario === 'multi_hazard') {
      const h = p.hazards || 'storm,flood,landslide';
      const hList = h.split(',');
      impactGrade = hList.length >= 3 ? 4 : hList.length >= 2 ? 3 : 2;
      agents = [
        { agent_id: 'multi', agent_name: 'Đại lý Đa thiên tai', icon: '⚡', action: 'Kết hợp: ' + h, priority: 'Cao', actions: ['Tổng hợp cảnh báo', 'Huy động toàn lực', 'Sơ tán đa hướng'] },
        { agent_id: 'command', agent_name: 'Tổng chỉ huy', icon: '🎖️', action: 'Điều phối ứng phó', priority: 'Cao', actions: ['Phân công lực lượng', 'Ưu tiên khu vực'] },
        { agent_id: 'med', agent_name: 'Đại lý Y tế', icon: '🏥', action: 'Ứng cứu y tế', priority: 'Cao', actions: ['Bệnh viện dã chiến', 'Xe cứu thương'] },
        { agent_id: 'logistics', agent_name: 'Đại lý Hậu cần', icon: '🚚', action: 'Vận chuyển', priority: 'Cao', actions: ['Xe tăng phe', 'Nước uống', 'Lương thực'] },
        { agent_id: 'satellite', agent_name: 'Đại lý Vệ tinh', icon: '🛰️', action: 'Tổng hợp toàn cảnh thiên tai từ không gian', priority: 'Cao', actions: ['Chồng lớp ảnh vệ tinh', 'Đối chiếu nhiệt độ bề mặt', 'Cảnh báo biến đổi địa hình'] }
      ];
      summary = province + ' — ĐA THIÊN TAI: ' + h + '. ' + (impactGrade >= 4 ? 'KHẨN CẤP TUYỆT ĐỐI!' : 'Cảnh báo cao.');
      extraFields = h;
    } else {
      impactGrade = 2;
      summary = province + ' — đang theo dõi.';
    }

    const status = impactGrade >= 4 ? 'Khẩn cấp' : impactGrade >= 3 ? 'Báo động' : impactGrade >= 2 ? 'Cảnh báo' : 'Bình thường';

    return {
      success: true,
      data: {
        status: status,
        impact_grade: impactGrade,
        impact_color: impactGrade >= 4 ? '#ff1744' : impactGrade >= 3 ? '#ff9100' : '#00c853',
        engine: 'rule',
        agents_total: agents.length,
        agent_decisions: agents,
        impact_analysis: {
          summary: summary,
          key_infrastructure: ['Hệ thống đê điều', 'Trạm bơm nước', 'Kho dự trữ', 'Trạm y tế', 'Trường học'],
          affected_zone: province + ' và vùng lân cận',
          extra_info: extraFields
        },
        recommendation: impactGrade >= 4 ? 'KHẨN CẤP: Sơ tán ngay! Kích hoạt toàn bộ hệ thống.' : impactGrade >= 3 ? 'CẢNH BÁO CAO: Theo dõi chặt. Chuẩn bị sơ tán.' : impactGrade >= 2 ? 'CẢNH BÁO: Tăng cường giám sát.' : 'BÌNH THƯỜNG: Tiếp tục theo dõi.',
        llm_summary: 'Mô phỏng rule-based: ' + province + ' — ' + sLabel + ' — ' + status,
        timestamp: new Date().toISOString(),
        source: 'mock_fallback'
      }
    };
  }

  const MIROFISH_PAGES = {
    'mirofishSim': {
      label: '🧠 Mô phỏng Đa Đại lý',
      render: function() {
        return `
          <div class="pt">🧠 Mô phỏng Đa Đại lý (GraphRAG) — MiroFish Bridge</div>
          <div class="ps">DANH ĐẠT (SÓI CÔ ĐỘC) — Agent tự động phản ứng theo ngưỡng thiên tai ĐBSCL</div>

          <div style="background:linear-gradient(135deg,rgba(124,77,255,.08),rgba(0,200,83,.05));border:1px solid rgba(124,77,255,.2);border-radius:12px;padding:14px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:600;margin-bottom:8px">🎯 Kịch bản thiên tai</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
              <div>
                <div style="font-size:10px;color:#607d8b;margin-bottom:4px">Tỉnh / Thành phố</div>
                <select id="mfProvince" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px">
                  ${PROVINCES.map(p => `<option value="${p}"${p === 'Kiên Giang' ? ' selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
              <div>
                <div style="font-size:10px;color:#607d8b;margin-bottom:4px">Loại thiên tai</div>
                <select id="mfScenario" onchange="updateMirofishFields()" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px">
                  ${Object.entries(SCENARIOS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
                </select>
              </div>
              <div id="mfExtraField" style="display:flex;gap:8px"></div>
            </div>
            <div id="mfDynamicFields" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
              ${renderScenarioFields('salinity_flood')}
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
              <button class="btn bp" onclick="window.runMirofishDemo && runMirofishDemo()">🚨 Demo kịch bản</button>
              <button class="btn bp" onclick="triggerMirofish()">🚀 Kích hoạt Mô phỏng Đa Đại lý</button>
            </div>
          </div>

          <div id="mfResult">
            <div class="cc"><h3>🛰️ Hệ thống chưa kích hoạt</h3>
              <div style="font-size:12px;color:#607d8b;margin-top:6px">
                Chọn kịch bản, điều chỉnh tham số, bấm <b>Kích hoạt Mô phỏng Đa Đại lý</b> để gọi MiroFish GraphRAG.
              </div>
            </div>
          </div>
        `;
      }
    }
  };

  function renderScenarioFields(scenarioKey) {
    const s = SCENARIOS[scenarioKey];
    if (!s) return '';
    return s.fields.map(f => {
      const d = s.defaults[f] || '';
      const fieldDefs = {
        salinity: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Độ mặn (‰)</div><input id="mfSalinity" type="number" step="0.1" min="0" max="20" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        floodTier: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Cấp lũ (0–4)</div><select id="mfFloodTier" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"><option value="0">0 — Bình thường</option><option value="1">1 — Theo dõi</option><option value="2">2 — Báo động I</option><option value="3"${d==3?' selected':''}>3 — Báo động II</option><option value="4">4 — Báo động III</option></select></div>`,
        magnitude: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Độ lớn (Mw)</div><input id="mfMagnitude" type="number" step="0.1" min="3" max="9" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        depth: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Độ sâu (km)</div><input id="mfDepth" type="number" step="1" min="0" max="700" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        distance: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Khoảng cách bờ (km)</div><input id="mfDistance" type="number" step="1" min="0" max="5000" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        volcano: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Núi lửa</div><select id="mfVolcano" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"><option value="Chư Đrăng"${d==='Chư Đrăng'?' selected':''}>Chư Đrăng (Gia Lai)</option><option value="Hàm Rồng"${d==='Hàm Rồng'?' selected':''}>Hàm Rồng (Kon Tum)</option><option value="Núi Bà"${d==='Núi Bà'?' selected':''}>Núi Bà (Lâm Đồng)</option></select></div>`,
        alertLevel: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Mức cảnh báo (1-4)</div><select id="mfAlertLevel" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"><option value="1">1 — Bình thường</option><option value="2"${d==2?' selected':''}>2 — Cảnh báo</option><option value="3">3 — Khẩn cấp</option><option value="4">4 — Phun trào</option></select></div>`,
        rainfall: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Lượng mưa 72h (mm)</div><input id="mfRainfall" type="number" step="1" min="0" max="1000" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        slope: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Độ dốc (°)</div><input id="mfSlope" type="number" step="1" min="0" max="60" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        spi: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Chỉ số SPI</div><input id="mfSPI" type="number" step="0.1" min="-3" max="3" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        vhi: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Chỉ số VHI</div><input id="mfVHI" type="number" step="1" min="0" max="100" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        area: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Diện tích (ha)</div><input id="mfArea" type="number" step="1" min="1" max="10000" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        wind: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Gió (km/h)</div><input id="mfWind" type="number" step="1" min="0" max="100" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        category: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Cấp bão (1-5)</div><select id="mfCategory" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"><option value="1">1 — Bão yếu</option><option value="2">2 — Bão</option><option value="3"${d==3?' selected':''}>3 — Bão mạnh</option><option value="4">4 — Bão rất mạnh</option><option value="5">5 — Siêu bão</option></select></div>`,
        tide: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Bão cồn (m)</div><input id="mfTide" type="number" step="0.1" min="0" max="5" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`,
        hazards: `<div><div style="font-size:10px;color:#607d8b;margin-bottom:4px">Kết hợp (storm,flood,landslide...)</div><input id="mfHazards" type="text" value="${d}" style="width:100%;background:#131c31;border:1px solid #1e2d4a;border-radius:8px;color:#e8eaf6;padding:8px;font-size:12px"></div>`
      };
      return fieldDefs[f] || '';
    }).join('');
  }

  window.updateMirofishFields = function() {
    const sel = document.getElementById('mfScenario');
    const container = document.getElementById('mfDynamicFields');
    if (sel && container) {
      container.innerHTML = renderScenarioFields(sel.value);
    }
  };

  window.triggerMirofish = function() {
    const province = document.getElementById('mfProvince') ? document.getElementById('mfProvince').value : 'Kiên Giang';
    const scenario = document.getElementById('mfScenario') ? document.getElementById('mfScenario').value : 'salinity_flood';
    const params = getScenarioParams(scenario);
    params.province = province;
    loadMirofishSimulation(params);
  };

  window.runMirofishDemo = function() {
    const scenario = document.getElementById('mfScenario') ? document.getElementById('mfScenario').value : 'salinity_flood';
    const demoProvince = getDemoProvince(scenario);
    const params = getScenarioParams(scenario);
    params.province = demoProvince;
    if (document.getElementById('mfProvince')) document.getElementById('mfProvince').value = demoProvince;
    Object.entries(params).forEach(([k, v]) => {
      const el = document.getElementById('mf' + k.charAt(0).toUpperCase() + k.slice(1));
      if (el) el.value = v;
    });
    loadMirofishSimulation(params);
  };

  function getDemoProvince(scenario) {
    const demos = {
      'salinity_flood': 'Kiên Giang',
      'earthquake': 'Quảng Trị',
      'tsunami': 'Khánh Hòa',
      'volcano': 'Gia Lai',
      'landslide': 'Lào Cai',
      'drought': 'Đắk Lắk',
      'wildfire': 'Bình Thuận',
      'storm_surge': 'Quảng Ninh',
      'multi_hazard': 'Quảng Nam'
    };
    return demos[scenario] || 'Kiên Giang';
  }

  function getScenarioParams(scenario) {
    const s = SCENARIOS[scenario];
    if (!s) return { salinity: 4.2, floodTier: 3 };
    const params = {};
    s.fields.forEach(f => {
      const el = document.getElementById('mf' + f.charAt(0).toUpperCase() + f.slice(1));
      if (el) {
        params[f] = el.type === 'number' ? parseFloat(el.value) : (el.type === 'select-one' ? parseInt(el.value) : el.value);
      } else {
        params[f] = s.defaults[f];
      }
    });
    return params;
  }

  async function loadMirofishSimulation(params) {
    const result = document.getElementById('mfResult');
    if (!result) return;
    const scenario = document.getElementById('mfScenario') ? document.getElementById('mfScenario').value : 'salinity_flood';
    const province = params.province || 'Kiên Giang';
    result.innerHTML = `<div class="cc"><h3>⏳ Đang kích hoạt Multi-Agent...</h3>
      <div style="font-size:12px;color:#607d8b;margin-top:6px">GraphRAG đang truy vấn tri thức ĐBSCL · ${province} · ${SCENARIOS[scenario]?.label || scenario} · ${JSON.stringify(params)}</div></div>`;

    try {
      const resp = await fetch(`${MIROFISH_API}/mekong-trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'MiroFish unavailable');
      renderMirofishResult(result, data.data || {}, scenario);
    } catch (e) {
      params.scenario = scenario;
      const mock = generateMockData(params);
      renderMirofishResult(result, mock.data || {}, scenario);
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
          ${esc(imp.extra_info || (imp.salinity_level ? 'Mặn: ' + imp.salinity_level + ' · ' + (imp.flood_level_name || '') : ''))}
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
