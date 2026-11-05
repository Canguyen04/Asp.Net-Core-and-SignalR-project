import React,{useEffect,useMemo,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {api,errorMessage} from '../../api';
import {subscribeRealtime} from '../../realtime';
import {Icon,PageHeader,StatCard,StatusBadge,OrderRoute,EmptyState,MetricSkeletonGrid,OrderCardSkeletonList,money} from '../../ui/kit';

export default function DriverDashboard({userInfo}){
 const navigate=useNavigate();const [params,setParams]=useSearchParams();const tab=params.get('tab')==='mine'?'mine':'available';
 const [available,setAvailable]=useState([]),[myOrders,setMyOrders]=useState([]),[online,setOnline]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState('');

 const refresh=async()=>{
   try{
     const [a,b]=await Promise.all([api.get('/orders/available'),api.get('/orders')]);
     setAvailable(a.data);setMyOrders(b.data);setError('');
   }catch(e){setError(errorMessage(e))}
   finally{setLoading(false)}
 };

 useEffect(()=>{
   refresh();
   api.get('/users/me').then(({data})=>setOnline(Boolean(data.online))).catch(()=>{});
   return subscribeRealtime(userInfo,({event})=>{if(['order_created','status_changed'].includes(event))refresh()});
 },[userInfo.user_id]);

 const accept=async id=>{
   setBusy(true);
   try{await api.post(`/orders/${id}/accept`);await refresh();navigate(`/order/${id}`)}
   catch(e){setError(errorMessage(e));await refresh()}
   finally{setBusy(false)}
 };

 const toggle=()=>{
   const next=!online;
   if(!navigator.geolocation){setError('Trình duyệt không hỗ trợ GPS.');return}
   navigator.geolocation.getCurrentPosition(
     pos=>api.put('/drivers/me/location',{latitude:pos.coords.latitude,longitude:pos.coords.longitude,online:next}).then(()=>{setOnline(next);setError('')}).catch(e=>setError(errorMessage(e))),
     ()=>setError('Cần cho phép GPS để cập nhật trạng thái nhận đơn.'),
     {timeout:8000}
   );
 };

 const activeTrips=myOrders.filter(o=>!['completed','cancelled'].includes(o.status));
 const completed=myOrders.filter(o=>o.status==='completed');
 const list=useMemo(()=>(tab==='mine'?myOrders:available).filter(o=>`${o.id} ${o.pickup} ${o.dropoff}`.toLowerCase().includes(search.toLowerCase())),[tab,available,myOrders,search]);

 return <>
  <PageHeader
    eyebrow="ĐỐI TÁC / ĐIỀU PHỐI DI ĐỘNG"
    title="Bảng điều khiển tài xế"
    description={`Xin chào ${userInfo.name}. Chúc bạn thượng lộ bình an!`}
    actions={<button className="btn btn-outline-light d-flex gap-2 align-items-center" onClick={refresh}><Icon name="refresh" size={16}/> Đồng bộ đơn</button>}
  />

  {/* Thanh gạt Trạng thái Trực tuyến chuẩn Mobile */}
  <div className={`driver-banner ${online ? 'driver-banner-online' : ''}`}>
    <div className="d-flex align-items-center gap-3">
      <span className="metric-icon metric-orange"><Icon name="truck" size={24}/></span>
      <div>
        <strong className="d-block" style={{fontSize:14}}>{online ? 'Đang trực tuyến nhận chuyến' : 'Đang tạm dừng nhận chuyến'}</strong>
        <small className="text-muted">{userInfo.license_plate||'Chưa cập nhật biển số'} · {online?'Hệ thống đang tìm đơn gần bạn':'Gạt công tắc để bắt đầu nhận đơn'}</small>
      </div>
    </div>
    <div className="driver-banner-controls">
      <span className={`status-pill ${online?'status-success':'status-pending'}`}>
        <span className="status-dot"/>{online?'Trực tuyến':'Ngoại tuyến'}
      </span>
      <button
        type="button"
        onClick={toggle}
        className={`btn ${online ? 'btn-outline-danger' : 'btn-orange'} driver-online-btn`}
      >
        <Icon name="lightning" size={16}/> {online ? 'Tắt nhận đơn' : 'Bật nhận đơn'}
      </button>
    </div>
  </div>

  {error&&<div className="alert alert-danger">{error}</div>}

  {/* Thẻ nhắc nhở Chuyến đang thực hiện (Giúp tài xế bấm 1 chạm khi đang chạy ngoài đường) */}
  {activeTrips.length > 0 && (
    <div className="driver-active-trip-banner mb-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <span className="eyebrow m-0 text-white"><span className="online-dot"/> CHUYẾN ĐANG THỰC HIỆN ({activeTrips.length})</span>
        <StatusBadge status={activeTrips[0].status}/>
      </div>
      <h3 className="text-white mb-2" style={{fontSize:16}}>Đơn #{activeTrips[0].id} · {activeTrips[0].serviceName}</h3>
      <p className="text-white-50 small mb-3">Giao đến: {activeTrips[0].dropoff}</p>
      <div className="d-flex gap-2 flex-wrap">
        <button className="btn btn-light fw-bold flex-grow-1 py-2" onClick={()=>navigate(`/order/${activeTrips[0].id}`)}>
          Mở & Cập nhật bước giao <Icon name="arrow" size={15}/>
        </button>
        <a
          className="btn btn-outline-light py-2 d-flex align-items-center justify-content-center gap-1"
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeTrips[0].status==='accepted'?activeTrips[0].pickup:activeTrips[0].dropoff)}`}
        >
          <Icon name="map" size={16}/> Chỉ đường
        </a>
      </div>
    </div>
  )}

  {loading ? <MetricSkeletonGrid count={4}/> : (
    <div className="metrics-grid">
      <StatCard label="Đơn có thể nhận" value={available.length} icon="package" note="Phù hợp với xe của bạn"/>
      <StatCard label="Đang vận chuyển" value={activeTrips.length} icon="route" tone="blue" note="Chuyến đang thực hiện"/>
      <StatCard label="Hoàn thành" value={completed.length} icon="check" tone="green" note="Tổng chuyến hoàn tất"/>
      <StatCard label="Thu nhập tích lũy" value={money(completed.reduce((n,o)=>n+Number(o.driverEarning||0),0))} icon="wallet" tone="purple" note="Từ đơn đã hoàn thành"/>
    </div>
  )}

  <div className="surface-card">
    <div className="panel-head flex-wrap">
      <div>
        <h2>Danh sách vận chuyển</h2>
        <p>Chạm vào đơn để xem lộ trình hoặc nhận chuyến ngay.</p>
      </div>
      <button className="btn btn-outline-light d-flex align-items-center gap-2" onClick={()=>navigate('/wallet')}>
        <Icon name="wallet" size={16}/> Ví tài xế
      </button>
    </div>
    <div className="surface-body">
      <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">
        <div className="segmented-tabs w-100-mobile">
          <button className={tab==='available'?'active':''} onClick={()=>setParams({tab:'available'})}>Đơn đang mở ({available.length})</button>
          <button className={tab==='mine'?'active':''} onClick={()=>setParams({tab:'mine'})}>Chuyến của tôi ({myOrders.length})</button>
        </div>
        <label className="filter-input w-100-mobile">
          <Icon name="search" size={16}/>
          <input placeholder="Tìm mã đơn, tên đường, cảng..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </label>
      </div>

      {loading ? <OrderCardSkeletonList count={3}/> : list.length===0 ? (
        <EmptyState
          icon="truck"
          title="Chưa có chuyến hàng"
          description={tab==='available'?'Các đơn mới phù hợp với phương tiện của bạn sẽ tự động xuất hiện tại đây.':'Bạn chưa nhận đơn hàng nào.'}
        />
      ) : list.map(o => (
        <article key={o.id} className="order-list-card driver-order-card">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <strong className="order-number" style={{fontSize:15}}>Đơn #{o.id}</strong>
              <span className="status-pill status-info">{o.serviceName}</span>
              <span className="status-pill status-pending">{Number(o.distance||0).toFixed(1)} km</span>
            </div>
            <StatusBadge status={o.status}/>
          </div>

          <OrderRoute pickup={o.pickup} dropoff={o.dropoff}/>

          {o.packageDetails && (
            <div className="mt-2 p-2 rounded-2 small text-muted" style={{background:'#f8fafc'}}>
              📦 {o.packageDetails}
            </div>
          )}

          <div className="driver-card-footer mt-3 pt-3 border-top">
            <div>
              <small className="text-muted d-block">Tổng cước khách trả</small>
              <b style={{fontSize:19,color:'#ef742a'}}>{money(o.totalPrice)}</b>
              {o.driverEarning > 0 && <small className="text-success d-block fw-bold">Thực nhận: {money(o.driverEarning)}</small>}
            </div>
            <div className="driver-card-actions">
              <a
                className="btn btn-outline-light d-flex align-items-center justify-content-center gap-1"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o.pickup)}&destination=${encodeURIComponent(o.dropoff)}`}
              >
                <Icon name="map" size={15}/> Bản đồ
              </a>
              {tab==='available' ? (
                <button className="btn btn-orange driver-accept-btn" disabled={!online||busy} onClick={()=>accept(o.id)}>
                  {busy?'Đang nhận...':'Nhận chuyến ngay'} <Icon name="arrow" size={16}/>
                </button>
              ) : (
                <button className="btn btn-orange driver-accept-btn" onClick={()=>navigate(`/order/${o.id}`)}>
                  Xử lý chuyến <Icon name="chevron" size={16}/>
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
      {!online&&tab==='available'&&<p className="small text-muted mt-2 mb-0"><Icon name="info" size={14} className="me-1"/> Bạn cần bấm nút <b>"Bật nhận đơn"</b> phía trên và cấp quyền GPS để có thể nhận chuyến.</p>}
    </div>
  </div>
 </>;
}