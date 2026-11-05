import React, { useState, useEffect } from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AddressSearchInput from '../components/AddressSearchInput';
import BookingMap from '../components/BookingMap';
import { api, errorMessage } from '../api';
import { Icon, PageHeader, money } from '../ui/kit';

// Danh sách 10 Cảng lớn tại TP.HCM làm điểm xuất phát cho Container
const PORT_LIST = [
  { name: "Cảng Cát Lái (TP. Thủ Đức)", lat: 10.7661, lng: 106.7820 },
  { name: "Cảng Tân Cảng Phú Hữu (TP. Thủ Đức)", lat: 10.7895, lng: 106.8138 },
  { name: "Cảng Tân Cảng Hiệp Phước (Nhà Bè)", lat: 10.6272, lng: 106.7594 },
  { name: "Cảng Container Quốc tế Việt Nam - VICT (Quận 7)", lat: 10.7437, lng: 106.7322 },
  { name: "Cảng Tân Thuận (Quận 7)", lat: 10.7578, lng: 106.7419 },
  { name: "Cảng Bến Nghé (Quận 7)", lat: 10.7538, lng: 106.7383 },
  { name: "Cảng Saigon Premier Container Terminal - SPCT (Nhà Bè)", lat: 10.6214, lng: 106.7567 },
  { name: "Cảng Container Quốc tế SP-ITC (TP. Thủ Đức)", lat: 10.7905, lng: 106.8202 },
  { name: "Cảng ICD Phước Long / Trường Thọ (TP. Thủ Đức)", lat: 10.8285, lng: 106.7581 },
  { name: "Cảng Sài Gòn - Khu vực Nhà Rồng Khánh Hội (Quận 4)", lat: 10.7644, lng: 106.7088 }
];

export default function Booking() {
  const navigate = useNavigate();
  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null;

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  
  const [userLocation, setUserLocation] = useState(null);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  
  // Danh sách điểm giao phụ (Thêm điểm giao)
  const [waypoints, setWaypoints] = useState([]);

  const [senderName, setSenderName] = useState(userInfo?.name || '');
  const [senderPhone, setSenderPhone] = useState(userInfo?.phone || '');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [packageDetails, setPackageDetails] = useState('');

  const [distance, setDistance] = useState(0);
  const [serviceType, setServiceType] = useState('express'); 
  const [routePolyline, setRoutePolyline] = useState([]); 
  
  // Các dịch vụ bổ sung (Chỉ áp dụng cho xe máy & xe tải, không áp dụng cho Container)
  const [basePrice, setBasePrice] = useState(0);
  const [isDoorDelivery, setIsDoorDelivery] = useState(false); // Giao tận tay (+10.000đ)
  const [isLoadingSupport, setIsLoadingSupport] = useState(false); // Bốc xếp 2 đầu (+50.000đ xe máy / +150.000đ xe tải)
  const [isUpstairs, setIsUpstairs] = useState(false); // Giao lên tầng lầu (+20.000đ)
  const [tipAmount, setTipAmount] = useState(''); 
  const [totalPrice, setTotalPrice] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [hasCod, setHasCod] = useState(false);
  const [codAmount, setCodAmount] = useState('');

  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.warn("GPS Error: ", error)
      );
    }
  }, []);

  // Khi chuyển qua lại giữa Container và xe khác: xử lý điểm bắt đầu ở cảng & reset dịch vụ bổ sung
  useEffect(() => { 
    if (serviceType === 'container') {
      setIsDoorDelivery(false);
      setIsLoadingSupport(false);
      setIsUpstairs(false);
      setHasCod(false);
      setCodAmount('');
      setTipAmount('');
      // Mặc định chọn cảng đầu tiên (Cảng Cát Lái) nếu điểm lấy hiện tại chưa phải là cảng
      const isAlreadyPort = PORT_LIST.some(p => p.name === pickupAddress);
      if (!isAlreadyPort) {
        setPickupAddress(PORT_LIST[0].name);
        setPickupCoords({ lat: PORT_LIST[0].lat, lng: PORT_LIST[0].lng });
      }
    }
  }, [serviceType]);

  // Quản lý thêm/xóa/cập nhật điểm giao phụ
  const addWaypoint = () => {
    if (waypoints.length >= 4) return;
    setWaypoints(prev => [...prev, { address: '', coords: null, note: '' }]);
  };

  const removeWaypoint = (index) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index));
  };

  const updateWaypointAddress = (index, address) => {
    setWaypoints(prev => prev.map((w, i) => i === index ? { ...w, address, coords: null } : w));
  };

  const updateWaypointCoords = (index, coords) => {
    setWaypoints(prev => prev.map((w, i) => i === index ? { ...w, coords } : w));
  };

  const validWaypointsCount = waypoints.filter(w => w.coords).length;
  const stopFeePerPoint = serviceType === 'container' ? 300000 : serviceType === 'truck' ? 40000 : 15000;
  const extraStopsFee = validWaypointsCount * stopFeePerPoint;
  const loadingFeeAmount = serviceType === 'truck' ? 150000 : 50000;

  // Định tuyến OSRM qua tất cả các điểm dừng
  useEffect(() => {
    const fetchMultiStopRoute = async () => {
      if (!pickupCoords || !dropoffCoords) {
        setDistance(0);
        setBasePrice(0);
        setRoutePolyline([]);
        return;
      }
      const validWps = waypoints.filter(w => w.coords).map(w => w.coords);
      const allPoints = [pickupCoords, ...validWps, dropoffCoords];
      const coordString = allPoints.map(p => `${p.lng},${p.lat}`).join(';');

      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`);
        const data = await response.json();
        if (data.routes?.length > 0) {
          const km = Math.max(0.5, parseFloat((data.routes[0].distance / 1000).toFixed(1)));
          setDistance(km);
          setRoutePolyline(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
          return;
        }
      } catch (error) {
        console.warn("OSRM fallback:", error);
      }

      // Fallback tính tổng khoảng cách chim bay * 1.3 qua các trạm
      let totalHaversine = 0;
      const rad = Math.PI / 180;
      for (let i = 0; i < allPoints.length - 1; i++) {
        const p1 = allPoints[i], p2 = allPoints[i + 1];
        const dLat = (p2.lat - p1.lat) * rad, dLng = (p2.lng - p1.lng) * rad;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * rad) * Math.cos(p2.lat * rad) * Math.sin(dLng / 2) ** 2;
        totalHaversine += 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      setDistance(Math.max(0.5, Math.round(totalHaversine * 1.3 * 10) / 10));
      setRoutePolyline(allPoints.map(p => [p.lat, p.lng]));
    };

    fetchMultiStopRoute();
  }, [pickupCoords, dropoffCoords, waypoints]);

  // Tính cước cơ bản theo quãng đường và loại xe
  useEffect(() => {
    if (pickupCoords && dropoffCoords && distance > 0) {
      let calcBase = 0;
      if (serviceType === 'container') {
        const BASE_CONTAINER = 2600000; 
        calcBase = BASE_CONTAINER + Math.max(0, Math.ceil(distance - 20)) * 33000;
      } else if (serviceType === 'truck') {
        calcBase = 150000 + Math.max(0, Math.ceil(distance - 5)) * 15000;
      } else {
        if (distance <= 3) calcBase = 16000;
        else if (distance <= 5) calcBase = 25000;
        else calcBase = 25000 + (Math.ceil(distance - 5) * 6500);
      }
      setBasePrice(Math.ceil(calcBase / 1000) * 1000);
    } else {
      setBasePrice(0);
    }
  }, [distance, pickupCoords, dropoffCoords, serviceType]);

  // Tính tổng tiền bao gồm điểm giao phụ và dịch vụ bổ sung
  useEffect(() => {
    let extra = extraStopsFee;
    if (serviceType !== 'container') {
      if (isDoorDelivery) extra += 10000;
      if (isLoadingSupport) extra += loadingFeeAmount;
      if (isUpstairs) extra += 20000;
      extra += (parseInt(tipAmount) || 0);
    }
    setTotalPrice(basePrice + extra);
  }, [basePrice, extraStopsFee, serviceType, isDoorDelivery, isLoadingSupport, isUpstairs, loadingFeeAmount, tipAmount]);

  useEffect(() => {
    if (appliedPromo && totalPrice < appliedPromo.min_order_value) {
      setAppliedPromo(null);
      setPromoCodeInput('');
    }
  }, [totalPrice, appliedPromo]);

  const reverseGeocode = async (lat, lng, type) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data?.address) {
        const addr = data.address;
        const finalAddress = [addr.amenity || addr.building, addr.road, addr.suburb, addr.city_district].filter(Boolean).join(', ');
        type === 'pickup' ? setPickupAddress(finalAddress || data.display_name) : setDropoffAddress(finalAddress || data.display_name);
      }
    } catch { 
      type === 'pickup' ? setPickupAddress("Địa điểm lấy hàng (Bản đồ)") : setDropoffAddress("Địa điểm giao hàng (Bản đồ)");
    }
  };

  const handleApplyPromo = () => {
    if (promoCodeInput === 'ITVINA' || promoCodeInput === 'SGU') {
      setAppliedPromo({ discount_amount: 15000, min_order_value: 0 });
    } else {
      alert("❌ Mã không hợp lệ (Hãy thử: ITVINA hoặc SGU)");
      setAppliedPromo(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pickupCoords || !dropoffCoords) {
      setIsError(true);
      setMessage('Vui lòng chọn đầy đủ điểm lấy hàng và điểm giao hàng.');
      return;
    }
    setIsSubmitting(true);
    setMessage('Đang khởi tạo đơn vận chuyển...');
    setIsError(false);

    // Gộp thông tin các điểm giao phụ và dịch vụ bổ sung vào chuỗi hiển thị để tương thích hoàn toàn với Backend
    const activeWaypoints = waypoints.filter(w => w.address && w.coords);
    const combinedDropoff = activeWaypoints.length > 0
      ? `${activeWaypoints.map((w, i) => `[Điểm ${i + 1}: ${w.address}]`).join(' → ')} → [Điểm cuối: ${dropoffAddress}]`
      : dropoffAddress;

    const extraNotes = [];
    if (serviceType !== 'container') {
      if (isDoorDelivery) extraNotes.push('Giao tận tay');
      if (isLoadingSupport) extraNotes.push('Bốc xếp 2 đầu');
      if (isUpstairs) extraNotes.push('Giao lên tầng lầu');
    }
    const finalPackageDetails = [
      packageDetails,
      extraNotes.length ? `Dịch vụ kèm: ${extraNotes.join(', ')}` : '',
      activeWaypoints.length ? `Số điểm giao: ${activeWaypoints.length + 1} điểm` : ''
    ].filter(Boolean).join(' | ');

    try {
      const { data } = await api.post('/orders', {
        pickupAddress,
        dropoffAddress: combinedDropoff,
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropoffLat: dropoffCoords.lat,
        dropoffLng: dropoffCoords.lng,
        waypoints: activeWaypoints,
        serviceType,
        senderName,
        senderPhone,
        receiverName,
        receiverPhone,
        packageDetails: finalPackageDetails,
        paymentMethod,
        isBulky: serviceType !== 'container' && (isLoadingSupport || isUpstairs),
        isDoorDelivery: serviceType !== 'container' && isDoorDelivery,
        tipAmount: serviceType !== 'container' ? (Number(tipAmount) || 0) : 0,
        codAmount: serviceType !== 'container' && hasCod ? (Number(codAmount) || 0) : 0,
        promotionCode: appliedPromo ? promoCodeInput : null
      });
      navigate(`/order/${data.id}`);
    } catch (err) {
      setIsError(true);
      setMessage(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalTotalPrice = Math.max(0, totalPrice - (appliedPromo ? appliedPromo.discount_amount : 0));

  return <>
    <PageHeader
      eyebrow="VẬN HÀNH / TẠO ĐƠN"
      title="Tạo đơn vận chuyển"
      description="Nhập thông tin hành trình, chọn phương tiện và xác nhận đơn hàng."
      actions={<button className="btn btn-outline-light d-flex gap-2 align-items-center" onClick={() => navigate('/guest')}><Icon name="back" size={16}/> Về tổng quan</button>}
    />
    {message && <div className={`alert alert-${isError ? 'danger' : 'success'}`}>{message}</div>}
    
    <div className="booking-grid">
      <Form onSubmit={handleSubmit}>
        {/* BƯỚC 01: CHỌN PHƯƠNG TIỆN */}
        <section className="surface-card mb-3">
          <div className="panel-head">
            <div>
              <h2><span className="step-dot">01</span> Chọn loại phương tiện</h2>
              <p>3 dịch vụ vận chuyển chuyên biệt theo quy mô kiện hàng.</p>
            </div>
          </div>
          <div className="surface-body d-flex flex-column gap-2">
            {[
              ['express', 'Xe máy giao nhanh', 'Gói nhỏ gọn, chứng từ, giao siêu tốc nội thành', '16.000 ₫', 'truck'],
              ['truck', 'Xe tải nhẹ 1.5 tấn', 'Hàng cồng kềnh, chuyển kho, vận chuyển liên quận', '150.000 ₫', 'package'],
              ['container', 'Vận chuyển Container', 'Lấy hàng trực tiếp từ Cảng Sài Gòn đi kho / nhà máy', '2.600.000 ₫', 'route']
            ].map(([type, name, desc, minimum, icon]) => (
              <button
                type="button"
                key={type}
                className={`vehicle-card w-100 text-start ${serviceType === type ? 'active' : ''}`}
                onClick={() => setServiceType(type)}
              >
                <div className="d-flex align-items-center gap-3">
                  <span className="metric-icon"><Icon name={icon} size={21}/></span>
                  <div>
                    <strong className="d-block" style={{ fontSize: 13 }}>{name}</strong>
                    <small className="text-muted">{desc}</small>
                  </div>
                </div>
                <div className="text-end">
                  <strong className="d-block" style={{ color: '#f47a32', fontSize: 13 }}>
                    {basePrice && serviceType === type ? money(basePrice) : `Từ ${minimum}`}
                  </strong>
                  <small className="text-muted">{serviceType === type ? 'Đang chọn' : 'Chọn dịch vụ'}</small>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* BƯỚC 02: HÀNH TRÌNH & THÊM ĐIỂM GIAO */}
        <section className="surface-card mb-3">
          <div className="panel-head">
            <div>
              <h2><span className="step-dot">02</span> Thông tin hành trình</h2>
              <p>
                {serviceType === 'container'
                  ? 'Điểm bắt đầu được lấy từ danh sách 10 Cảng tại TP.HCM.'
                  : 'Chọn điểm lấy, điểm giao và thêm điểm dừng nếu cần giao nhiều nơi.'}
              </p>
            </div>
          </div>
          <div className="surface-body">
            {/* ĐIỂM BẮT ĐẦU (LẤY HÀNG) */}
            <div className="mb-3">
              <label className="form-label">
                {serviceType === 'container' ? 'ĐIỂM LẤY HÀNG (CẢNG XUẤT PHÁT TẠI TP.HCM)' : 'ĐIỂM LẤY HÀNG (BẮT ĐẦU)'}
              </label>
              {serviceType === 'container' ? (
                <Form.Select
                  value={pickupAddress}
                  onChange={e => {
                    const port = PORT_LIST.find(p => p.name === e.target.value);
                    if (port) {
                      setPickupAddress(port.name);
                      setPickupCoords({ lat: port.lat, lng: port.lng });
                    }
                  }}
                >
                  {PORT_LIST.map(p => <option key={p.name} value={p.name}>⚓ {p.name}</option>)}
                </Form.Select>
              ) : (
                <AddressSearchInput
                  placeholder="Tìm địa chỉ lấy hàng..."
                  value={pickupAddress}
                  onChange={v => { setPickupAddress(v); setPickupCoords(null); }}
                  onSelectLocation={setPickupCoords}
                  userLocation={userLocation}
                  badgeColor="muted"
                />
              )}
            </div>

            {/* DANH SÁCH ĐIỂM GIAO PHỤ (WAYPOINTS) */}
            {waypoints.map((wp, index) => (
              <div key={index} className="mb-3 p-3 rounded-3" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label m-0 text-primary">
                    📦 ĐIỂM GIAO PHỤ #{index + 1} (+{money(stopFeePerPoint)})
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-1 px-2"
                    onClick={() => removeWaypoint(index)}
                  >
                    <Icon name="x" size={13}/> Xóa điểm này
                  </button>
                </div>
                <AddressSearchInput
                  placeholder={`Nhập địa chỉ điểm giao phụ #${index + 1}...`}
                  value={wp.address}
                  onChange={v => updateWaypointAddress(index, v)}
                  onSelectLocation={coords => updateWaypointCoords(index, coords)}
                  userLocation={userLocation}
                />
              </div>
            ))}

            {/* ĐIỂM GIAO HÀNG CUỐI */}
            <div className="mb-3">
              <label className="form-label">
                {waypoints.length > 0 ? 'ĐIỂM GIAO HÀNG CUỐI CÙNG' : 'ĐIỂM GIAO HÀNG'}
              </label>
              <AddressSearchInput
                placeholder={serviceType === 'container' ? "Nhập địa chỉ kho / nhà máy nhận container..." : "Tìm địa chỉ giao hàng..."}
                value={dropoffAddress}
                onChange={v => { setDropoffAddress(v); setDropoffCoords(null); }}
                onSelectLocation={setDropoffCoords}
                userLocation={userLocation}
                badgeColor="orange"
              />
            </div>

            {/* NÚT THÊM ĐIỂM GIAO */}
            <div className="d-flex justify-content-between align-items-center pt-1">
              <button
                type="button"
                className="btn btn-outline-light d-inline-flex align-items-center gap-2"
                onClick={addWaypoint}
                disabled={waypoints.length >= 4}
              >
                <Icon name="plus" size={15}/> Thêm điểm giao ({waypoints.length}/4)
              </button>
              {waypoints.length > 0 && (
                <small className="text-muted">Lộ trình sẽ tự động tối ưu qua {waypoints.length + 1} điểm giao</small>
              )}
            </div>
          </div>
        </section>

        {/* BƯỚC 03: NGƯỜI GỬI, NGƯỜI NHẬN & HÀNG HÓA */}
        <section className="surface-card mb-3">
          <div className="panel-head">
            <div>
              <h2><span className="step-dot">03</span> Người gửi, người nhận và hàng hóa</h2>
              <p>Những thông tin tài xế cần để liên hệ khi nhận và giao hàng.</p>
            </div>
          </div>
          <div className="surface-body">
            <Row className="g-3">
              <Col sm={6}>
                <Form.Label>Tên người gửi / Điều phối</Form.Label>
                <Form.Control required value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Họ tên người gửi"/>
              </Col>
              <Col sm={6}>
                <Form.Label>Số điện thoại người gửi</Form.Label>
                <Form.Control required type="tel" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="Số điện thoại"/>
              </Col>
              <Col sm={6}>
                <Form.Label>Tên người nhận</Form.Label>
                <Form.Control required value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Họ tên người nhận"/>
              </Col>
              <Col sm={6}>
                <Form.Label>Số điện thoại người nhận</Form.Label>
                <Form.Control required type="tel" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} placeholder="Số điện thoại"/>
              </Col>
              <Col xs={12}>
                <Form.Label>Chi tiết hàng hóa / Số hiệu Container / Ghi chú</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  required
                  value={packageDetails}
                  onChange={e => setPackageDetails(e.target.value)}
                  placeholder={serviceType === 'container' ? "VD: Cont 40ft lạnh, số cont MSKU1234567, giao kho KCN Sóng Thần..." : "Ví dụ: 2 thùng hàng dễ vỡ, gọi trước 15 phút..."}
                />
              </Col>
            </Row>
          </div>
        </section>

        {/* BƯỚC 04: DỊCH VỤ BỔ SUNG & THANH TOÁN */}
        <section className="surface-card mb-3">
          <div className="panel-head">
            <div>
              <h2><span className="step-dot">04</span> Dịch vụ bổ sung và thanh toán</h2>
              <p>{serviceType === 'container' ? 'Vận chuyển Container áp dụng cước trọn gói theo tuyến.' : 'Tùy chọn hỗ trợ giao tận tay, bốc xếp, lên lầu và thu hộ COD.'}</p>
            </div>
          </div>
          <div className="surface-body">
            <Row className="g-3">
              {serviceType !== 'container' ? (
                <Col sm={6}>
                  <Form.Label>Dịch vụ bổ sung</Form.Label>
                  <Form.Check
                    id="chk-door"
                    className="mb-2"
                    label="Giao tận tay (+10.000 ₫)"
                    checked={isDoorDelivery}
                    onChange={e => setIsDoorDelivery(e.target.checked)}
                  />
                  <Form.Check
                    id="chk-loading"
                    className="mb-2"
                    label={`Bốc xếp 2 đầu (+${money(loadingFeeAmount)})`}
                    checked={isLoadingSupport}
                    onChange={e => setIsLoadingSupport(e.target.checked)}
                  />
                  <Form.Check
                    id="chk-upstairs"
                    className="mb-3"
                    label="Giao lên tầng lầu (+20.000 ₫)"
                    checked={isUpstairs}
                    onChange={e => setIsUpstairs(e.target.checked)}
                  />
                  <Form.Label>Tiền tip khích lệ tài xế (VNĐ)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="5000"
                    value={tipAmount}
                    onChange={e => setTipAmount(e.target.value)}
                    placeholder="0"
                  />
                </Col>
              ) : (
                <Col sm={6}>
                  <div className="p-3 rounded-3 h-100 d-flex flex-column justify-content-center" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <strong className="d-block mb-1" style={{ fontSize: 12 }}>Chính sách vận tải Container</strong>
                    <p className="small text-muted m-0">
                      Đơn hàng Container xuất phát từ cảng sử dụng thiết bị nâng hạ chuyên dụng tại cảng & kho, không áp dụng các phụ phí giao tầng lầu, bốc xếp thủ công hoặc COD.
                    </p>
                  </div>
                </Col>
              )}

              <Col sm={6}>
                <Form.Label>Phương thức thanh toán</Form.Label>
                <Form.Select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mb-3">
                  <option value="cash">Tiền mặt khi nhận/giao</option>
                  <option value="bank">Chuyển khoản doanh nghiệp / Ngân hàng</option>
                </Form.Select>

                {serviceType !== 'container' && (
                  <>
                    <Form.Check
                      id="chk-cod"
                      label="Ứng tiền / Thu hộ COD"
                      checked={hasCod}
                      onChange={e => { setHasCod(e.target.checked); setCodAmount(''); }}
                      className="mb-2"
                    />
                    {hasCod && (
                      <>
                        <Form.Label>Số tiền cần thu hộ (VNĐ)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="10000"
                          required
                          value={codAmount}
                          onChange={e => setCodAmount(e.target.value)}
                          placeholder="Nhập số tiền COD..."
                        />
                      </>
                    )}
                  </>
                )}
              </Col>
            </Row>
          </div>
        </section>

        <button
          className="btn btn-orange w-100 py-3 d-flex align-items-center justify-content-center gap-2"
          type="submit"
          disabled={!pickupCoords || !dropoffCoords || isSubmitting}
        >
          {isSubmitting ? 'Đang tạo đơn...' : <>Xác nhận đặt giao hàng <Icon name="arrow" size={17}/></>}
        </button>
      </Form>

      {/* CỘT PHẢI: BẢN ĐỒ & BẢNG TÍNH CHI PHÍ */}
      <div className="booking-map-sticky">
        <section className="surface-card mb-3">
          <div className="panel-head">
            <div>
              <h2>Lộ trình trực quan</h2>
              <p>
                {pickupCoords && dropoffCoords
                  ? `${distance || '—'} km · Qua ${validWaypointsCount + 1} điểm giao`
                  : 'Chọn điểm lấy và điểm giao để xem tuyến đường'}
              </p>
            </div>
            <Icon name="map" size={20} className="text-muted"/>
          </div>
          <div className="surface-body">
            <div className="booking-map-frame">
              <BookingMap
                serviceType={serviceType}
                pickupCoords={pickupCoords}
                setPickupCoords={setPickupCoords}
                dropoffCoords={dropoffCoords}
                setDropoffCoords={setDropoffCoords}
                setDropoffAddress={setDropoffAddress}
                waypoints={waypoints}
                reverseGeocode={reverseGeocode}
                routePolyline={routePolyline}
              />
            </div>
            <small className="text-muted d-block mt-2">
              {serviceType === 'container'
                ? 'Mẹo: Điểm lấy cố định tại cảng đã chọn. Bấm trên bản đồ để chọn nhanh điểm hạ container.'
                : 'Mẹo: Bạn có thể bấm trực tiếp trên bản đồ để chọn nhanh tọa độ lấy/giao.'}
            </small>
          </div>
        </section>

        <section className="surface-card">
          <div className="panel-head">
            <div>
              <h2>Chi tiết chi phí</h2>
              <p>Tự động tính toán theo lộ trình và dịch vụ chọn kèm</p>
            </div>
            <Icon name="wallet" size={20} className="text-muted"/>
          </div>
          <div className="surface-body">
            <div className="price-line">
              <span>Cước vận chuyển ({distance || 0} km)</span>
              <strong>{money(basePrice)}</strong>
            </div>
            {validWaypointsCount > 0 && (
              <div className="price-line">
                <span>Phụ phí thêm {validWaypointsCount} điểm giao</span>
                <strong>{money(extraStopsFee)}</strong>
              </div>
            )}
            {serviceType !== 'container' && isDoorDelivery && (
              <div className="price-line">
                <span>Giao tận tay</span>
                <strong>10.000 ₫</strong>
              </div>
            )}
            {serviceType !== 'container' && isLoadingSupport && (
              <div className="price-line">
                <span>Bốc xếp 2 đầu</span>
                <strong>{money(loadingFeeAmount)}</strong>
              </div>
            )}
            {serviceType !== 'container' && isUpstairs && (
              <div className="price-line">
                <span>Giao lên tầng lầu</span>
                <strong>20.000 ₫</strong>
              </div>
            )}
            {serviceType !== 'container' && Number(tipAmount) > 0 && (
              <div className="price-line">
                <span>Tiền tip tài xế</span>
                <strong>{money(tipAmount)}</strong>
              </div>
            )}
            {appliedPromo && (
              <div className="price-line">
                <span>Mã giảm giá ({promoCodeInput})</span>
                <strong className="text-success">- {money(appliedPromo.discount_amount)}</strong>
              </div>
            )}
            {serviceType !== 'container' && hasCod && Number(codAmount) > 0 && (
              <div className="price-line">
                <span>Tiền thu hộ COD (Tài xế thu khách)</span>
                <strong className="text-primary">{money(codAmount)}</strong>
              </div>
            )}

            <div className="d-flex gap-2 mt-4">
              <Form.Control
                aria-label="Mã giảm giá"
                placeholder="Mã ưu đãi (SGU, ITVINA)"
                value={promoCodeInput}
                onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
              />
              <button type="button" className="btn btn-outline-light" onClick={handleApplyPromo}>Áp dụng</button>
            </div>

            <div className="price-total">
              <span>Tổng cước tạm tính</span>
              <strong>{money(finalTotalPrice)}</strong>
            </div>
            <div className="small text-muted mt-2">
              <Icon name="info" size={13} className="me-1"/> Tổng phí chính thức được xác nhận và lưu trữ bởi hệ thống khi tạo đơn.
            </div>
          </div>
        </section>
      </div>
    </div>
  </>;
}