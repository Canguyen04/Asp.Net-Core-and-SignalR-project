import React, { useState, useEffect, useRef } from 'react';
import { Form, ListGroup, Placeholder } from 'react-bootstrap';

// Hàm tính khoảng cách đường chim bay (km)
const calculateStraightDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

// Danh sách các địa điểm giao nhận phổ biến tại TP.HCM để gợi ý tức thì
const POPULAR_PLACES = [
  { title: 'Đại học Sài Gòn (SGU)', subtitle: '273 An Dương Vương, Phường 3, Quận 5, TP.HCM', lat: 10.7599, lng: 106.6822, keywords: 'sgu dai hoc sai gon an duong vuong' },
  { title: 'Chợ Bến Thành', subtitle: 'Đường Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM', lat: 10.7725, lng: 106.6980, keywords: 'cho ben thanh quan 1' },
  { title: 'Sân bay Quốc tế Tân Sơn Nhất', subtitle: 'Đường Trường Sơn, Phường 2, Quận Tân Bình, TP.HCM', lat: 10.8185, lng: 106.6588, keywords: 'san bay tan son nhat tsn' },
  { title: 'Vinhomes Central Park (Landmark 81)', subtitle: '208 Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh, TP.HCM', lat: 10.7950, lng: 106.7218, keywords: 'landmark 81 vinhomes central park binh thanh' },
  { title: 'Vạn Hạnh Mall', subtitle: '11 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM', lat: 10.7710, lng: 106.6679, keywords: 'van hanh mall su van hanh quan 10' },
  { title: 'Bến xe Miền Đông Mới', subtitle: '501 Hoàng Hữu Nam, Phường Long Bình, TP. Thủ Đức, TP.HCM', lat: 10.8794, lng: 106.8142, keywords: 'ben xe mien dong moi thu duc' },
  { title: 'Bến xe Miền Tây', subtitle: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM', lat: 10.7411, lng: 106.6186, keywords: 'ben xe mien tay kinh duong vuong binh tan' },
  { title: 'Khu Công Nghiệp Tân Bình', subtitle: 'Đường Tây Thạnh, Quận Tân Phú / Tân Bình, TP.HCM', lat: 10.8118, lng: 106.6267, keywords: 'kcn khu cong nghiep tan binh tay thanh' },
  { title: 'Khu Công Nghệ Cao TP.HCM (SHTP)', subtitle: 'Xa lộ Hà Nội, Phường Tân Phú, TP. Thủ Đức, TP.HCM', lat: 10.8551, lng: 106.7850, keywords: 'khu cong nghe cao shtp quan 9 thu duc' },
  { title: 'Chợ Đầu Mối Nông Sản Thủ Đức', subtitle: 'Quốc lộ 1A, Phường Tam Bình, TP. Thủ Đức, TP.HCM', lat: 10.8687, lng: 106.7319, keywords: 'cho dau moi thu duc tam binh' },
  { title: 'Khu Công Nghiệp Sóng Thần', subtitle: 'Đại lộ Độc Lập, Dĩ An, Bình Dương (Giáp TP. Thủ Đức)', lat: 10.8925, lng: 106.7461, keywords: 'kcn khu cong nghiep song than di an binh duong' },
  { title: 'Crescent Mall (Phú Mỹ Hưng)', subtitle: '101 Tôn Dật Tiên, Phường Tân Phú, Quận 7, TP.HCM', lat: 10.7289, lng: 106.7186, keywords: 'crescent mall phu my hung quan 7' }
];

// Bỏ dấu tiếng Việt để so khớp từ khóa nhanh
const removeAccents = (str = '') =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// Chuẩn hóa các từ viết tắt phổ biến ở Việt Nam
const normalizeVietnameseQuery = (rawText) => {
  let s = rawText.trim();
  s = s.replace(/\b(đh|dh)\b/gi, 'Đại học');
  s = s.replace(/\b(bv)\b/gi, 'Bệnh viện');
  s = s.replace(/\b(kcn)\b/gi, 'Khu công nghiệp');
  s = s.replace(/\b(bx)\b/gi, 'Bến xe');
  s = s.replace(/\b(cc)\b/gi, 'Chung cư');
  s = s.replace(/\b(tttm)\b/gi, 'Trung tâm thương mại');
  s = s.replace(/\bq\.?\s*(\d+)\b/gi, 'Quận $1');
  s = s.replace(/\bp\.?\s*(\d+)\b/gi, 'Phường $1');
  s = s.replace(/\b(tp\.?\s*hcm|hcm|sg|sài gòn)\b/gi, 'Hồ Chí Minh');
  return s;
};

// Làm sạch tên địa chỉ trả về (loại bỏ mã bưu chính 700000, Việt Nam thừa)
const cleanDisplayAddress = (rawAddr = '') => {
  return rawAddr
    .split(',')
    .map(p => p.trim())
    .filter(p => p && !/^\d{5,6}$/.test(p) && !['việt nam', 'vietnam', 'vnm'].includes(p.toLowerCase()))
    .join(', ');
};

export default function AddressSearchInput({
  label,
  placeholder,
  value,
  onChange,
  onSelectLocation,
  badgeColor,
  userLocation
}) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  const performSearch = async (rawText) => {
    const normalized = normalizeVietnameseQuery(rawText);
    const plainQuery = removeAccents(normalized);

    // 1. Lọc nhanh các địa điểm nổi bật khớp từ khóa
    const localMatches = POPULAR_PLACES.filter(p =>
      removeAccents(`${p.title} ${p.subtitle} ${p.keywords}`).includes(plainQuery)
    ).map(p => ({
      title: p.title,
      subtitle: p.subtitle,
      fullAddress: `${p.title}, ${p.subtitle}`,
      lat: p.lat,
      lng: p.lng,
      source: 'local'
    }));

    // Nếu chưa có tên tỉnh/thành thì ưu tiên tìm trong TP.HCM
    const hasCity = /hồ chí minh|bình dương|đồng nai|long an|tây ninh|vũng tàu/i.test(normalized);
    const queryWithCity = hasCity ? normalized : `${normalized}, Hồ Chí Minh`;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setShowDropdown(true);

    try {
      // 2. Gọi song song OpenStreetMap Nominatim (mạnh về POI, tòa nhà, hẻm VN) và ArcGIS (mạnh về số nhà)
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        queryWithCity
      )}&countrycodes=vn&addressdetails=1&limit=6&viewbox=106.35,11.15,107.05,10.35&bounded=0`;

      const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
        queryWithCity
      )}&countryCode=VNM&location=106.6601,10.7626&distance=50000&maxLocations=5`;

      const [nomRes, arcRes] = await Promise.allSettled([
        fetch(nominatimUrl, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'vi' }
        }).then(r => r.json()),
        fetch(arcgisUrl, { signal: controller.signal }).then(r => r.json())
      ]);

      const merged = [...localMatches];

      // Xử lý kết quả từ OpenStreetMap Nominatim
      if (nomRes.status === 'fulfilled' && Array.isArray(nomRes.value)) {
        nomRes.value.forEach(item => {
          const cleaned = cleanDisplayAddress(item.display_name);
          const parts = cleaned.split(',');
          const title = item.name || parts[0];
          const subtitle = parts.slice(1).join(', ').trim() || 'TP. Hồ Chí Minh';
          merged.push({
            title,
            subtitle,
            fullAddress: cleaned,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            source: 'osm'
          });
        });
      }

      // Xử lý kết quả từ ArcGIS
      if (arcRes.status === 'fulfilled' && Array.isArray(arcRes.value?.candidates)) {
        arcRes.value.candidates.forEach(item => {
          const cleaned = cleanDisplayAddress(item.address);
          const parts = cleaned.split(',');
          const title = parts[0];
          const subtitle = parts.slice(1).join(', ').trim() || 'TP. Hồ Chí Minh';
          merged.push({
            title,
            subtitle,
            fullAddress: cleaned,
            lat: item.location.y,
            lng: item.location.x,
            source: 'arcgis'
          });
        });
      }

      // 3. Khử trùng lặp những địa điểm có cùng tên hoặc tọa độ sát nhau (< 80m)
      const uniqueResults = [];
      for (const cand of merged) {
        const isDuplicate = uniqueResults.some(
          u =>
            removeAccents(u.title) === removeAccents(cand.title) ||
            (Math.abs(u.lat - cand.lat) < 0.0008 && Math.abs(u.lng - cand.lng) < 0.0008)
        );
        if (!isDuplicate) uniqueResults.push(cand);
      }

      setResults(uniqueResults.slice(0, 8));
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Lỗi tìm kiếm địa chỉ:', error);
        setResults(localMatches);
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    onChange(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (text.trim().length < 2) {
      setResults(POPULAR_PLACES.slice(0, 5).map(p => ({
        title: p.title,
        subtitle: p.subtitle,
        fullAddress: `${p.title}, ${p.subtitle}`,
        lat: p.lat,
        lng: p.lng
      })));
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 350);
  };

  const handleFocus = () => {
    if (!value || value.trim().length < 2) {
      setResults(POPULAR_PLACES.slice(0, 5).map(p => ({
        title: p.title,
        subtitle: p.subtitle,
        fullAddress: `${p.title}, ${p.subtitle}`,
        lat: p.lat,
        lng: p.lng
      })));
    }
    setShowDropdown(true);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onChange(item.fullAddress);
    onSelectLocation({ lat: item.lat, lng: item.lng });
    setShowDropdown(false);
  };

  const handleUseCurrentLocation = async () => {
    if (!userLocation?.lat || !userLocation?.lng) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'vi' } }
      );
      const data = await res.json();
      const cleaned = cleanDisplayAddress(data?.display_name) || 'Vị trí GPS hiện tại của tôi';
      onChange(cleaned);
      onSelectLocation({ lat: userLocation.lat, lng: userLocation.lng });
    } catch {
      onChange('Vị trí GPS hiện tại của tôi');
      onSelectLocation({ lat: userLocation.lat, lng: userLocation.lng });
    } finally {
      setIsLoading(false);
      setShowDropdown(false);
    }
  };

  return (
    <Form.Group className="mb-0 position-relative" ref={wrapperRef}>
      {label && <Form.Label className={`fw-bold text-${badgeColor}`}>{label}</Form.Label>}
      
      <div className="position-relative">
        <Form.Control
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          style={{ paddingRight: value ? '34px' : undefined }}
        />
        {value && (
          <button
            type="button"
            aria-label="Xóa địa chỉ"
            onClick={() => {
              onChange('');
              onSelectLocation(null);
              handleFocus();
            }}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: 14,
              padding: '2px 6px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <ListGroup
          className="position-absolute w-100 shadow-lg mt-1"
          style={{ zIndex: 1050, maxHeight: '280px', overflowY: 'auto', borderRadius: '10px' }}
        >
          {/* Nút chọn nhanh vị trí GPS hiện tại nếu trình duyệt đã cấp quyền */}
          {userLocation?.lat && (
            <ListGroup.Item
              action
              onClick={handleUseCurrentLocation}
              className="d-flex align-items-center py-2"
              style={{ background: '#fff7f2', borderBottom: '1px solid #ffe4d1' }}
            >
              <span className="me-2">🎯</span>
              <div>
                <div className="fw-bold" style={{ color: '#ef742a', fontSize: '0.82rem' }}>
                  Sử dụng vị trí hiện tại của tôi
                </div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  Lấy tự động theo định vị GPS trên thiết bị
                </div>
              </div>
            </ListGroup.Item>
          )}

          {isLoading ? (
            <>
              <ListGroup.Item>
                <Placeholder animation="glow"><Placeholder xs={8} /></Placeholder>
                <Placeholder animation="glow"><Placeholder xs={5} size="sm" /></Placeholder>
              </ListGroup.Item>
              <ListGroup.Item>
                <Placeholder animation="glow"><Placeholder xs={6} /></Placeholder>
                <Placeholder animation="glow"><Placeholder xs={4} size="sm" /></Placeholder>
              </ListGroup.Item>
            </>
          ) : results.length > 0 ? (
            results.map((item, index) => {
              const distKm = calculateStraightDistance(
                userLocation?.lat,
                userLocation?.lng,
                item.lat,
                item.lng
              );

              return (
                <ListGroup.Item
                  action
                  key={index}
                  onClick={() => handleSelect(item)}
                  className="d-flex align-items-start py-2"
                >
                  <span className="me-2 mt-1">📍</span>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="fw-bold text-truncate" style={{ fontSize: '0.84rem' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem' }} className="text-muted text-truncate">
                      {distKm && <span className="text-primary fw-bold me-1">{distKm} km •</span>}
                      {item.subtitle}
                    </div>
                  </div>
                </ListGroup.Item>
              );
            })
          ) : (
            <ListGroup.Item className="text-muted text-center py-3">
              Không tìm thấy địa điểm phù hợp. Bạn có thể chấm trực tiếp trên bản đồ!
            </ListGroup.Item>
          )}
        </ListGroup>
      )}
    </Form.Group>
  );
}