import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AddressSearchInput from '../components/AddressSearchInput';
import BookingMap from '../components/BookingMap';
import { api, errorMessage } from '../api';
import { Icon,PageHeader,money } from '../ui/kit';

const PORT_LIST = [
  { name: "Cảng Cát Lái", lat: 10.7661, lng: 106.7820 },
  { name: "Cảng Tân Cảng Phú Hữu", lat: 10.7895, lng: 106.8138 },
  { name: "Cảng Tân Cảng Hiệp Phước", lat: 10.6272, lng: 106.7594 },
  { name: "Cảng Container Quốc tế Việt Nam (VICT)", lat: 10.7437, lng: 106.7322 },
  { name: "Cảng Tân Thuận", lat: 10.7578, lng: 106.7419 },
  { name: "Cảng Bến Nghé", lat: 10.7538, lng: 106.7383 },
  { name: "Cảng Saigon Premier Container Terminal (SPCT)", lat: 10.6214, lng: 106.7567 },
  { name: "Cảng Container Quốc tế SP-ITC", lat: 10.7905, lng: 106.8202 }
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
  
  const [senderName, setSenderName] = useState(userInfo?.name || '');
  const [senderPhone, setSenderPhone] = useState(userInfo?.phone || '');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  
  const [packageDetails, setPackageDetails] = useState('');

  const [distance, setDistance] = useState(0);
  const [serviceType, setServiceType] = useState('express'); 
  const [routePolyline, setRoutePolyline] = useState([]); 
  
  const [basePrice, setBasePrice] = useState(0);
  const [isBulky, setIsBulky] = useState(false);
  const [isDoorDelivery, setIsDoorDelivery] = useState(false);
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

  useEffect(() => { 
    if (serviceType === 'container') {
      setIsBulky(false); setDropoffAddress(''); setDropoffCoords(null); 
    } 
  }, [serviceType]);

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const rad=Math.PI/180, dLat=(dropoffCoords.lat-pickupCoords.lat)*rad,dLng=(dropoffCoords.lng-pickupCoords.lng)*rad;
      const h=2*6371*Math.atan2(Math.sqrt(Math.sin(dLat/2)**2+Math.cos(pickupCoords.lat*rad)*Math.cos(dropoffCoords.lat*rad)*Math.sin(dLng/2)**2),Math.sqrt(1-(Math.sin(dLat/2)**2+Math.cos(pickupCoords.lat*rad)*Math.cos(dropoffCoords.lat*rad)*Math.sin(dLng/2)**2)));
      const quoteDistance=Math.max(0.5,Math.round(h*1.3*10)/10);
      let calcBase = 0;
      if (serviceType === 'container') {
        const BASE_CONTAINER = 2600000; 
        calcBase=BASE_CONTAINER+Math.max(0,Math.ceil(quoteDistance-20))*33000;
      } else if (serviceType === 'truck') {
        calcBase = 150000 + Math.max(0,Math.ceil(quoteDistance - 5)) * 15000;
      } else {
        if (quoteDistance <= 3) calcBase = 16000;
        else if (quoteDistance <= 5) calcBase = 25000;
        else calcBase = 25000 + (Math.ceil(quoteDistance - 5) * 6500);
      }
      setBasePrice(Math.ceil(calcBase / 1000) * 1000);
    } else setBasePrice(0);
  }, [pickupCoords, dropoffCoords, serviceType]);

  useEffect(() => {
    let extra = isBulky ? 20000 : 0;
    extra += isDoorDelivery ? 10000 : 0;
    setTotalPrice(basePrice + extra + (parseInt(tipAmount) || 0));
  }, [basePrice, isBulky, isDoorDelivery, tipAmount]);

  useEffect(() => {
    if (appliedPromo && totalPrice < appliedPromo.min_order_value) {
      setAppliedPromo(null); setPromoCodeInput('');
    }
  }, [totalPrice, appliedPromo]);

  const fetchRouteDistance = async (start, end) => {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
      const data = await response.json();
      if (data.routes?.length > 0) {
        setDistance(parseFloat((data.routes[0].distance / 1000).toFixed(1)));
        setRoutePolyline(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
      }
    } catch (error) { 
      setDistance(0);
      setRoutePolyline([[start.lat, start.lng], [end.lat, end.lng]]);
    }
  };

  useEffect(() => {
    if (pickupCoords && dropoffCoords) fetchRouteDistance(pickupCoords, dropoffCoords);
    else { setDistance(0); setBasePrice(0); setRoutePolyline([]); }
  }, [pickupCoords, dropoffCoords]);

  const reverseGeocode = async (lat, lng, type) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data?.address) {
        const addr = data.address;
        const finalAddress = [addr.amenity || addr.building, addr.road, addr.suburb, addr.city_district].filter(Boolean).join(', ');
        type === 'pickup' ? setPickupAddress(finalAddress || data.display_name) : setDropoffAddress(finalAddress || data.display_name);
      }
    } catch (error) { 
        type === 'pickup' ? setPickupAddress("Địa điểm lấy hàng (Demo)") : setDropoffAddress("Địa điểm giao hàng (Demo)");
    }
  };

  const handleApplyPromo = () => {
    if (promoCodeInput === 'ITVINA' || promoCodeInput === 'SGU') {
      setAppliedPromo({ discount_amount: 15000, min_order_value: 0 });
    } else {
      alert("❌ Mã không hợp lệ (Hãy thử: ITVINA hoặc SGU)"); setAppliedPromo(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pickupCoords || !dropoffCoords) { setIsError(true); setMessage('Vui lòng chọn hai địa điểm.'); return; }
    setIsSubmitting(true); setMessage('Đang tạo đơn trên ASP.NET Core...'); setIsError(false);
    try {
      const {data} = await api.post('/orders', {
        pickupAddress, dropoffAddress,
        pickupLat: pickupCoords.lat, pickupLng: pickupCoords.lng,
        dropoffLat: dropoffCoords.lat, dropoffLng: dropoffCoords.lng,
        serviceType, senderName, senderPhone, receiverName, receiverPhone, packageDetails,
        paymentMethod, isBulky, isDoorDelivery, tipAmount: Number(tipAmount)||0,
        codAmount: hasCod ? Number(codAmount)||0 : 0,
        promotionCode: appliedPromo ? promoCodeInput : null
      });
      setMessage(`Đã tạo đơn #${data.id} thành công (cước phí Backend: ${data.totalPrice.toLocaleString()}đ).`);
      navigate(`/order/${data.id}`);
    } catch (err) { setIsError(true); setMessage(errorMessage(err)); }
    finally { setIsSubmitting(false); }
  };

  const finalTotalPrice = Math.max(0, totalPrice - (appliedPromo ? appliedPromo.discount_amount : 0));

  return <>
    <PageHeader eyebrow="VẬN HÀNH / TẠO ĐƠN" title="Tạo đơn vận chuyển" description="Nhập thông tin hành trình, chọn phương tiện và xác nhận đơn hàng." actions={<button className="btn btn-outline-light d-flex gap-2 align-items-center" onClick={()=>navigate('/guest')}><Icon name="back" size={16}/> Về tổng quan</button>}/>
    {message&&<div className={`alert alert-${isError?'danger':'success'}`}>{message}</div>}
    <div className="booking-grid">
      <Form onSubmit={handleSubmit}>
        <section className="surface-card mb-3"><div className="panel-head"><div><h2><span className="step-dot">01</span> Chọn loại phương tiện</h2><p>Lựa chọn dịch vụ phù hợp với kiện hàng của bạn.</p></div></div><div className="surface-body d-flex flex-column gap-2">
          {[['express','Xe máy giao nhanh','Gói nhỏ, giao nội thành','16.000 ₫','truck'],['truck','Xe tải nhẹ 1.5 tấn','Hàng cồng kềnh, vận chuyển liên quận','150.000 ₫','package'],['container','Vận chuyển container','Vận tải liên cảng, hàng xuất nhập','2.600.000 ₫','route']].map(([type,name,desc,minimum,icon])=><button type="button" key={type} className={`vehicle-card w-100 text-start ${serviceType===type?'active':''}`} onClick={()=>setServiceType(type)}><div className="d-flex align-items-center gap-3"><span className="metric-icon"><Icon name={icon} size={21}/></span><div><strong className="d-block" style={{fontSize:12}}>{name}</strong><small className="text-muted">{desc}</small></div></div><div className="text-end"><strong className="d-block" style={{color:'#f47a32',fontSize:12}}>{basePrice&&serviceType===type?money(basePrice):`Từ ${minimum}`}</strong><small className="text-muted">{serviceType===type?'Đang chọn':'Chọn dịch vụ'}</small></div></button>)}
        </div></section>
        <section className="surface-card mb-3"><div className="panel-head"><div><h2><span className="step-dot">02</span> Thông tin hành trình</h2><p>Chọn điểm lấy và giao từ gợi ý địa chỉ hoặc trực tiếp trên bản đồ.</p></div></div><div className="surface-body"><div className="mb-3"><label className="form-label">ĐIỂM LẤY HÀNG</label><AddressSearchInput placeholder="Tìm địa chỉ lấy hàng..." value={pickupAddress} onChange={v=>{setPickupAddress(v);setPickupCoords(null)}} onSelectLocation={setPickupCoords} userLocation={userLocation} badgeColor="muted"/></div><div><label className="form-label">ĐIỂM GIAO HÀNG</label>{serviceType==='container'?<Form.Select value={dropoffAddress} onChange={e=>{const port=PORT_LIST.find(p=>p.name===e.target.value);if(port){setDropoffAddress(port.name);setDropoffCoords({lat:port.lat,lng:port.lng})}}}><option value="">Chọn cảng đích</option>{PORT_LIST.map(p=><option key={p.name} value={p.name}>{p.name}</option>)}</Form.Select>:<AddressSearchInput placeholder="Tìm địa chỉ giao hàng..." value={dropoffAddress} onChange={v=>{setDropoffAddress(v);setDropoffCoords(null)}} onSelectLocation={setDropoffCoords} userLocation={userLocation} badgeColor="orange"/>}</div></div></section>
        <section className="surface-card mb-3"><div className="panel-head"><div><h2><span className="step-dot">03</span> Người gửi, người nhận và hàng hóa</h2><p>Những thông tin tài xế cần để thực hiện giao hàng.</p></div></div><div className="surface-body"><Row className="g-3"><Col sm={6}><Form.Label>Tên người gửi</Form.Label><Form.Control required value={senderName} onChange={e=>setSenderName(e.target.value)} placeholder="Họ tên người gửi"/></Col><Col sm={6}><Form.Label>Số điện thoại người gửi</Form.Label><Form.Control required type="tel" value={senderPhone} onChange={e=>setSenderPhone(e.target.value)} placeholder="Số điện thoại"/></Col><Col sm={6}><Form.Label>Tên người nhận</Form.Label><Form.Control required value={receiverName} onChange={e=>setReceiverName(e.target.value)} placeholder="Họ tên người nhận"/></Col><Col sm={6}><Form.Label>Số điện thoại người nhận</Form.Label><Form.Control required type="tel" value={receiverPhone} onChange={e=>setReceiverPhone(e.target.value)} placeholder="Số điện thoại"/></Col><Col xs={12}><Form.Label>Chi tiết hàng hóa / ghi chú</Form.Label><Form.Control as="textarea" rows={3} required value={packageDetails} onChange={e=>setPackageDetails(e.target.value)} placeholder="Ví dụ: 1 thùng hàng, cần giao nhẹ tay..."/></Col></Row></div></section>
        <section className="surface-card mb-3"><div className="panel-head"><div><h2><span className="step-dot">04</span> Phụ phí và thanh toán</h2><p>Kiểm tra các yêu cầu trước khi lên đơn.</p></div></div><div className="surface-body"><Row className="g-3"><Col sm={6}><Form.Label>Dịch vụ bổ sung</Form.Label>{serviceType==='express'&&<Form.Check className="mb-2" label="Hàng cồng kềnh (+20.000đ)" checked={isBulky} onChange={e=>setIsBulky(e.target.checked)}/>}<Form.Check className="mb-3" label="Giao tận cửa (+10.000đ)" checked={isDoorDelivery} onChange={e=>setIsDoorDelivery(e.target.checked)}/><Form.Label>Tiền tip cho tài xế</Form.Label><Form.Control type="number" min="0" value={tipAmount} onChange={e=>setTipAmount(e.target.value)} placeholder="0"/></Col><Col sm={6}><Form.Label>Phương thức thanh toán</Form.Label><Form.Select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="mb-3"><option value="cash">Tiền mặt</option><option value="bank">Chuyển khoản (mô phỏng)</option></Form.Select><Form.Check label="Thu hộ COD" checked={hasCod} onChange={e=>{setHasCod(e.target.checked);setCodAmount('')}} className="mb-2"/>{hasCod&&<><Form.Label>Số tiền cần thu hộ</Form.Label><Form.Control type="number" min="0" value={codAmount} onChange={e=>setCodAmount(e.target.value)} placeholder="Nhập số tiền COD"/></>}</Col></Row></div></section>
        <button className="btn btn-orange w-100 py-3 d-flex align-items-center justify-content-center gap-2" type="submit" disabled={!pickupCoords||!dropoffCoords||isSubmitting}>{isSubmitting?'Đang tạo đơn...':<>Xác nhận tạo đơn <Icon name="arrow" size={17}/></>}</button>
      </Form>
      <div className="booking-map-sticky"><section className="surface-card mb-3"><div className="panel-head"><div><h2>Hành trình dự kiến</h2><p>{pickupCoords&&dropoffCoords?`${distance||'—'} km theo lộ trình bản đồ`:'Chọn hai địa chỉ để xem hành trình'}</p></div><Icon name="map" size={20} className="text-muted"/></div><div className="surface-body"><div className="booking-map-frame"><BookingMap pickupCoords={pickupCoords} setPickupCoords={setPickupCoords} dropoffCoords={dropoffCoords} setDropoffCoords={setDropoffCoords} setDropoffAddress={setDropoffAddress} reverseGeocode={reverseGeocode} routePolyline={routePolyline}/></div><small className="text-muted d-block mt-2">Mẹo: bấm trực tiếp trên bản đồ để chọn điểm lấy hoặc giao.</small></div></section>
        <section className="surface-card"><div className="panel-head"><div><h2>Chi tiết chi phí</h2><p>Giá dự kiến theo chính sách demo của hệ thống</p></div><Icon name="wallet" size={20} className="text-muted"/></div><div className="surface-body"><div className="price-line"><span>Phí vận chuyển</span><strong>{money(basePrice)}</strong></div>{isBulky&&<div className="price-line"><span>Phụ phí cồng kềnh</span><strong>20.000 ₫</strong></div>}{isDoorDelivery&&<div className="price-line"><span>Phí giao tận cửa</span><strong>10.000 ₫</strong></div>}{Number(tipAmount)>0&&<div className="price-line"><span>Tiền tip</span><strong>{money(tipAmount)}</strong></div>}{appliedPromo&&<div className="price-line"><span>Giảm giá</span><strong className="text-success">- {money(appliedPromo.discount_amount)}</strong></div>}<div className="d-flex gap-2 mt-4"><Form.Control aria-label="Mã giảm giá" placeholder="Mã ưu đãi (SGU, ITVINA)" value={promoCodeInput} onChange={e=>setPromoCodeInput(e.target.value.toUpperCase())}/><button type="button" className="btn btn-outline-light" onClick={handleApplyPromo}>Áp dụng</button></div><div className="price-total"><span>Tổng phí ước tính</span><strong>{money(finalTotalPrice)}</strong></div><div className="small text-muted mt-2"><Icon name="info" size={13} className="me-1"/> Tổng phí cuối cùng được xác nhận bởi backend khi tạo đơn.</div></div></section>
      </div>
    </div>
  </>;
}
