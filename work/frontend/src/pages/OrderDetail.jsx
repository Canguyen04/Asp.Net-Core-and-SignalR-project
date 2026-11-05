import React,{useEffect,useRef,useState} from 'react';
import {Modal,Form,InputGroup} from 'react-bootstrap';
import {useNavigate,useParams} from 'react-router-dom';
import {api,currentUser,errorMessage} from '../api';
import { API_URL } from '../config';
import {subscribeRealtime,joinOrder} from '../realtime';
import {Icon,PageHeader,StatusBadge,money,dateVi,EmptyState,Skeleton} from '../ui/kit';

const stages=['pending','accepted','arrived_pickup','delivering','completed'];
const labels=['Chờ tài xế','Đã nhận đơn','Đến điểm lấy','Đang giao','Hoàn thành'];

export default function OrderDetail(){
 const {id}=useParams(),navigate=useNavigate(),user=currentUser(),isDriver=user?.role?.startsWith('driver'),isCustomer=user?.role==='customer';
 const [loading,setLoading]=useState(true),[order,setOrder]=useState(null),[error,setError]=useState(''),[chatOpen,setChatOpen]=useState(false),[ratingOpen,setRatingOpen]=useState(false),[rating,setRating]=useState(5),[feedback,setFeedback]=useState(''),[rated,setRated]=useState(false),[chatInput,setChatInput]=useState(''),[chat,setChat]=useState([]),[busy,setBusy]=useState(false);const endRef=useRef(null);
 const home=()=>navigate(user?.role==='admin'?'/admin':isDriver?'/driver':'/guest');
 const refreshOrder=async()=>{try{const {data}=await api.get(`/orders/${id}`);setOrder(data);if(data.isRated||data.review)setRated(true);setError('')}catch(e){setError(errorMessage(e))}finally{setLoading(false)}};
 const refreshChat=async()=>{try{const {data}=await api.get(`/orders/${id}/messages`);setChat(data.map(m=>({...m,text:m.text??m.content}))) }catch{/* Not all roles can see chat */}};
 
 useEffect(()=>{
   setLoading(true);refreshOrder();if(user?.role!=='admin')refreshChat();
   const unsub=subscribeRealtime(user,d=>{
     if(d.event==='status_changed'&&Number(d.order?.id)===Number(id))refreshOrder();
     if(d.event==='new_chat_message'&&Number(d.orderId)===Number(id))refreshChat();
   });
   void joinOrder(id);return unsub;
 },[id,user?.user_id]);

 useEffect(()=>{if(chatOpen)endRef.current?.scrollIntoView({behavior:'smooth'})},[chat,chatOpen]);
 const mutate=async(status)=>{setBusy(true);try{await api.patch(`/orders/${id}/status`,{status});await refreshOrder()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}};
 const cancel=()=>{if(window.confirm('Bạn có muốn hủy đơn đang chờ tài xế?'))void mutate('cancelled')};
 const sendChat=async e=>{e.preventDefault();if(!chatInput.trim())return;try{await api.post(`/orders/${id}/messages`,{content:chatInput.trim()});setChatInput('');await refreshChat()}catch(e){setError(errorMessage(e))}};
 const submitRating=async e=>{e.preventDefault();try{await api.post(`/orders/${id}/reviews`,{stars:rating,feedback});setRated(true);setRatingOpen(false)}catch(e){setError(errorMessage(e))}};
 const uploadPod=async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){setError('Ảnh xác nhận phải nhỏ hơn 5 MB.');return}const form=new FormData();form.append('file',file);try{await api.post(`/orders/${id}/pod`,form);await refreshOrder()}catch(err){setError(errorMessage(err))}};
 const next={accepted:['arrived_pickup','Đã đến điểm lấy hàng'],arrived_pickup:['delivering','Bắt đầu đi giao hàng'],delivering:['completed','Xác nhận hoàn thành giao']}[order?.status];

 if(loading) return (
   <>
     <div className="mb-4"><Skeleton width={180} height={12} className="mb-2"/><Skeleton width={280} height={28}/></div>
     <div className="surface-card mb-4 p-4"><Skeleton width="100%" height={65}/></div>
     <div className="section-grid"><div className="surface-card p-4"><Skeleton height={220}/></div><div className="surface-card p-4"><Skeleton height={220}/></div></div>
   </>
 );

 if(!order)return <div className="surface-card"><EmptyState title="Không thể tải đơn hàng" description={error||`Không tìm thấy đơn #${id}`} action={<button onClick={home} className="btn btn-orange">Quay lại</button>}/></div>;
 const currentStep=stages.indexOf(order.status);const chatAllowed=(isDriver||isCustomer)&&Boolean(order.driver);
 const podUrl = order.proofPhotoPath ? (order.proofPhotoPath.startsWith('http') ? order.proofPhotoPath : `${API_URL}${order.proofPhotoPath}`) : null;

 return <>
  <PageHeader eyebrow={`VẬN HÀNH / ĐƠN HÀNG #${id}`} title={`Chi tiết đơn hàng #${id}`} description={`Tạo lúc ${dateVi(order.createdAt)} · ${order.serviceName||order.serviceType}`} actions={<><button className="btn btn-outline-light d-flex gap-2 align-items-center" onClick={home}><Icon name="back" size={16}/> Quay lại</button>{chatAllowed&&<button className="btn btn-orange d-flex gap-2 align-items-center" onClick={()=>setChatOpen(true)}><Icon name="message" size={16}/> Nhắn tin</button>}</>}/>
  {error&&<div className="alert alert-danger" role="alert">{error}</div>}
  
  <div className="surface-card mb-4">
    <div className="panel-head"><div><h2>Trạng thái vận chuyển</h2><p>Tự động cập nhật theo thời gian thực khi tài xế thao tác.</p></div><StatusBadge status={order.status}/></div>
    <div className="surface-body">
      <div className="detail-timeline">
        {stages.map((stage,i)=><div className={`detail-step ${currentStep>=i?'done':''} ${currentStep===i?'active':''}`} key={stage}><span className="step-bubble"><Icon name={currentStep>=i?'check':'clock'} size={12}/></span><span className="step-label">{labels[i]}</span></div>)}
      </div>
      {order.status==='cancelled'&&<p className="mb-0 text-danger fw-bold">Đơn hàng này đã bị hủy.</p>}
      {isCustomer&&order.status==='pending'&&<button className="btn btn-outline-danger mt-3" disabled={busy} onClick={cancel}>Hủy đơn đang chờ</button>}
    </div>
  </div>

  {/* Bảng thao tác nhanh ưu tiên hiển thị lên trên cho Tài xế */}
  {isDriver && (
    <section className="surface-card mb-4 border-warning">
      <div className="panel-head">
        <div><h2>Thao tác tác nghiệp tài xế</h2><p>Bấm nút bên dưới để chuyển bước giao hàng hoặc tải ảnh xác nhận (POD).</p></div>
        <Icon name="truck" size={22} className="text-primary"/>
      </div>
      <div className="surface-body">
        <div className="d-flex flex-wrap gap-3 align-items-center">
          {next ? (
            <button className="btn btn-orange py-3 px-4 flex-grow-1" style={{fontSize:14}} disabled={busy} onClick={()=>mutate(next[0])}>
              {busy ? 'Đang cập nhật...' : next[1]} <Icon name="arrow" size={18}/>
            </button>
          ) : (
            <span className="status-pill status-success">{order.status==='completed'?'Chuyến hàng đã hoàn thành':'Không có bước cập nhật tiếp theo'}</span>
          )}
          {['delivering','completed'].includes(order.status) && (
            <label className="flex-grow-1 m-0" style={{maxWidth:360}}>
              <span className="form-label">📸 Chụp / Tải ảnh xác nhận giao hàng (POD)</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="form-control" onChange={uploadPod}/>
            </label>
          )}
        </div>
      </div>
    </section>
  )}

  <div className="section-grid mb-4">
    <div className="d-flex flex-column gap-3">
      <section className="surface-card">
        <div className="panel-head"><div><h2>Hành trình giao hàng</h2><p>Thông tin địa điểm và người liên hệ hai đầu.</p></div><Icon name="route" size={21} className="text-muted"/></div>
        <div className="surface-body">
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2"><span className="route-pin start"/><span className="eyebrow m-0">ĐIỂM LẤY HÀNG</span></div>
            <h3 style={{fontSize:14}}>{order.pickup}</h3>
            <p className="mb-2" style={{fontSize:12}}>Người gửi: <b>{order.senderName}</b> · <a href={`tel:${order.senderPhone}`} className="text-primary fw-bold">{order.senderPhone}</a></p>
            <div className="d-flex gap-2 flex-wrap">
              <a className="btn btn-outline-light d-inline-flex gap-2 align-items-center" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.pickup)}`}><Icon name="map" size={15}/> Chỉ đường điểm lấy</a>
              {order.senderPhone && <a className="btn btn-outline-light d-inline-flex gap-2 align-items-center" href={`tel:${order.senderPhone}`}><Icon name="phone" size={15}/> Gọi người gửi</a>}
            </div>
          </div>
          <div className="pt-4 border-top">
            <div className="d-flex align-items-center gap-2 mb-2"><span className="route-pin end"/><span className="eyebrow m-0" style={{color:'#14a87c'}}>ĐIỂM GIAO HÀNG</span></div>
            <h3 style={{fontSize:14}}>{order.dropoff}</h3>
            <p className="mb-2" style={{fontSize:12}}>Người nhận: <b>{order.receiverName}</b> · <a href={`tel:${order.receiverPhone}`} className="text-primary fw-bold">{order.receiverPhone}</a></p>
            <div className="d-flex gap-2 flex-wrap">
              <a className="btn btn-outline-light d-inline-flex gap-2 align-items-center" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.dropoff)}`}><Icon name="map" size={15}/> Chỉ đường điểm giao</a>
              {order.receiverPhone && <a className="btn btn-outline-light d-inline-flex gap-2 align-items-center" href={`tel:${order.receiverPhone}`}><Icon name="phone" size={15}/> Gọi người nhận</a>}
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card">
        <div className="panel-head"><div><h2>Thông tin hàng hóa & POD</h2><p>Ghi chú đơn hàng và hình ảnh bằng chứng giao nhận.</p></div><Icon name="package" size={20} className="text-muted"/></div>
        <div className="surface-body">
          <p className="mb-3" style={{fontSize:13,color:'#334155'}}>{order.packageDetails||'Không có ghi chú.'}</p>
          <div className="d-flex flex-wrap gap-2">
            <span className="status-pill status-info">{order.serviceName}</span>
            <span className="status-pill status-pending">{order.distance} km (ước tính)</span>
          </div>
          {podUrl && (
            <div className="mt-3 pt-3 border-top">
              <p className="text-success small fw-bold mb-2"><Icon name="check" size={14} className="me-1"/> Ảnh xác nhận giao hàng (POD):</p>
              <a href={podUrl} target="_blank" rel="noreferrer">
                <img src={podUrl} alt="Ảnh xác nhận POD" style={{maxWidth:'100%', maxHeight:220, borderRadius:10, border:'1px solid #e2e8f0', objectFit:'cover'}} />
              </a>
            </div>
          )}
        </div>
      </section>
    </div>

    <div className="d-flex flex-column gap-3">
      <section className="surface-card">
        <div className="panel-head"><div><h2>Thông tin tài xế</h2><p>Đối tác được phân công thực hiện chuyến.</p></div><Icon name="truck" size={20} className="text-muted"/></div>
        <div className="surface-body">
          {order.driver ? <>
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="metric-icon metric-blue"><Icon name="user" size={22}/></span>
              <div>
                <strong style={{fontSize:14}}>{order.driver.name}</strong>
                <p className="m-0" style={{fontSize:12}}>Biển số: <b>{order.driver.licensePlate||'—'}</b></p>
              </div>
            </div>
            <div className="d-flex gap-2">
              {order.driver.phone&&<a className="btn btn-outline-light flex-grow-1 d-flex align-items-center justify-content-center gap-2" href={`tel:${order.driver.phone}`}><Icon name="phone" size={15}/> Gọi tài xế</a>}
              {chatAllowed&&<button className="btn btn-orange flex-grow-1 d-flex align-items-center justify-content-center gap-2" onClick={()=>setChatOpen(true)}><Icon name="message" size={15}/> Nhắn tin</button>}
            </div>
          </> : <EmptyState icon="truck" title="Đang tìm tài xế" description="Thông tin tài xế sẽ xuất hiện ngay sau khi có đối tác nhận đơn."/>}
        </div>
      </section>

      <section className="surface-card">
        <div className="panel-head"><div><h2>Chi tiết cước phí</h2><p>Dữ liệu cước phí được lưu trên hệ thống.</p></div><Icon name="wallet" size={20} className="text-muted"/></div>
        <div className="surface-body">
          <div className="price-line"><span>Cước vận chuyển</span><strong>{money(order.basePrice)}</strong></div>
          <div className="price-line"><span>Dịch vụ bổ sung & Phụ phí</span><strong>{money(order.extraFee)}</strong></div>
          {order.codAmount > 0 && <div className="price-line"><span>Thu hộ COD</span><strong className="text-primary">{money(order.codAmount)}</strong></div>}
          {isDriver&&<div className="price-line"><span>Thu nhập thực nhận của tài xế</span><strong className="text-success">{money(order.driverEarning)}</strong></div>}
          <div className="price-total"><span>Tổng thanh toán</span><strong>{money(order.totalPrice)}</strong></div>
          <div className="small text-muted mt-2">Phương thức: {order.paymentMethod==='cash'?'Tiền mặt':'Chuyển khoản'}</div>
        </div>
      </section>

      {isCustomer&&order.status==='completed'&&(
        <section className="surface-card">
          <div className="surface-body">
            <h2 className="surface-heading">Đánh giá chuyến giao</h2>
            <p className="small text-muted mt-2">Hãy cho biết trải nghiệm nhận hàng của bạn.</p>
            {rated?<span className="status-pill status-success"><Icon name="check" size={14}/> Đã gửi đánh giá</span>:<button className="btn btn-orange w-100" onClick={()=>setRatingOpen(true)}>Đánh giá tài xế</button>}
          </div>
        </section>
      )}
    </div>
  </div>

  <Modal show={chatOpen} onHide={()=>setChatOpen(false)} centered><Modal.Header closeButton><Modal.Title>Trao đổi về đơn #{order.id}</Modal.Title></Modal.Header><Modal.Body><div style={{height:310,overflow:'auto',background:'#f7f8fb',padding:15,borderRadius:10}}>{chat.length===0&&<p className="text-muted text-center small">Chưa có tin nhắn. Bắt đầu cuộc hội thoại!</p>}{chat.map((m,i)=><div key={m.id||i} className={`d-flex mb-2 ${m.sender===(isDriver?'driver':'customer')?'justify-content-end':'justify-content-start'}`}><div style={{maxWidth:'85%',padding:'9px 13px',borderRadius:12,background:m.sender===(isDriver?'driver':'customer')?'#ff782e':'white',color:m.sender===(isDriver?'driver':'customer')?'white':'#334155',fontSize:12}}>{m.text}</div></div>)}<div ref={endRef}/></div><Form onSubmit={sendChat} className="mt-3"><InputGroup><Form.Control value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Viết tin nhắn..."/><button className="btn btn-orange" type="submit">Gửi</button></InputGroup></Form></Modal.Body></Modal>
  <Modal show={ratingOpen} onHide={()=>setRatingOpen(false)} centered><Modal.Header closeButton><Modal.Title>Đánh giá tài xế</Modal.Title></Modal.Header><Form onSubmit={submitRating}><Modal.Body><p className="small text-muted">Chất lượng giao hàng có đáp ứng mong đợi của bạn?</p><div className="d-flex gap-2 mb-3">{[1,2,3,4,5].map(v=><button key={v} type="button" className={`btn ${v<=rating?'btn-warning':'btn-outline-light'}`} onClick={()=>setRating(v)} aria-label={`${v} sao`}>★</button>)}</div><Form.Label>Nhận xét</Form.Label><Form.Control as="textarea" rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} required={rating<=2} placeholder="Chia sẻ trải nghiệm..."/></Modal.Body><Modal.Footer><button type="button" className="btn btn-outline-light" onClick={()=>setRatingOpen(false)}>Hủy</button><button type="submit" className="btn btn-orange">Gửi đánh giá</button></Modal.Footer></Form></Modal>
 </>;
}