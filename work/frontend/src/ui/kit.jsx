import React from 'react';
import { useNavigate } from 'react-router-dom';

const paths={
  dashboard:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  truck:<><path d="M3 5h11v12H3zM14 9h4l3 4v4h-7z"/><circle cx="7.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/></>,
  package:<><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/></>,
  plus:<path d="M12 5v14M5 12h14"/>,
  search:<><circle cx="10.8" cy="10.8" r="7.1"/><path d="m16 16 5 5"/></>,
  wallet:<><rect x="2" y="5" width="20" height="16" rx="3"/><path d="M2 9V6a3 3 0 0 1 3-3h13M16 14h6M17 14h.01"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5v1"/></>,
  chart:<><path d="M3 3v18h18M7 16v-4M12 16V7M17 16v-8"/></>,
  map:<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/></>,
  arrow:<path d="M5 12h14m-7-7 7 7-7 7"/>,
  back:<path d="M19 12H5m7-7-7 7 7 7"/>,
  check:<path d="m4 12 5 5L20 6"/>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  x:<path d="M18 6 6 18M6 6l12 12"/>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
  logout:<><path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></>,
  chevron:<path d="m9 18 6-6-6-6"/>,
  pin:<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  refresh:<><path d="M20 11a8 8 0 0 0-14-5L3 9M3 4v5h5M4 13a8 8 0 0 0 14 5l3-3M21 20v-5h-5"/></>,
  route:<><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v4c0 3 12-2 12 3v3"/></>,
  shield:<><path d="m12 2 9 4v5c0 5-3 9-9 11-6-2-9-6-9-11V6z"/><path d="m8 12 3 3 5-6"/></>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  message:<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a8.5 8.5 0 1 1 16.1-4z"/>,
  download:<><path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/></>,
  filter:<><path d="M4 7h16M7 12h10M10 17h4"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M10 2h4l.7 3 2.6 1.5L20 5l2 3.5-2.3 2a8 8 0 0 1 0 3L22 15.5 20 19l-2.7-1.5-2.6 1.5-.7 3h-4l-.7-3-2.6-1.5L4 19l-2-3.5 2.3-2a8 8 0 0 1 0-3L2 8.5 4 5l2.7 1.5L9.3 5z"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></>,
  lightning:<path d="m13 2-9 11h7l-1 9 10-12h-7z"/>,
  phone:<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19 19 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7L9.7 7a2 2 0 0 1-.6 1.7L7.3 10a16 16 0 0 0 6.7 6.7l1.3-1.8a2 2 0 0 1 1.7-.6l3.3.6a2 2 0 0 1 1.7 2z"/>,
};

export function Icon({name='package',size=20,className='',...props}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>{paths[name]||paths.package}</svg>;
}

export const money=(value)=>`${Number(value||0).toLocaleString('vi-VN')} ₫`;
export const dateVi=(date)=>date ? new Date(date).toLocaleString('vi-VN') : '—';
export const STATUS={pending:['Chờ tài xế','pending'],accepted:['Đã nhận đơn','info'],arrived_pickup:['Đã tới điểm lấy','info'],delivering:['Đang giao hàng','warning'],completed:['Hoàn thành','success'],cancelled:['Đã hủy','danger']};

export function StatusBadge({status}){
  const [label,type]=STATUS[status]||[status||'Không rõ','neutral'];
  return <span className={`status-pill status-${type}`}><span className="status-dot"/>{label}</span>;
}

export function PageHeader({eyebrow, title,description,actions}){
  return <div className="page-header"><div><p className="eyebrow">{eyebrow||'TỔNG QUAN HỆ THỐNG'}</p><h1>{title}</h1>{description&&<p className="page-description">{description}</p>}</div>{actions&&<div className="page-actions">{actions}</div>}</div>;
}

export function StatCard({label,value,note,icon='package',tone='orange',loading=false}){
  if (loading) {
    return (
      <div className="metric-card">
        <div className="metric-top">
          <Skeleton width="55%" height={13} />
          <Skeleton width={38} height={38} radius={10} />
        </div>
        <Skeleton width="75%" height={28} className="my-2" />
        <Skeleton width="45%" height={11} />
      </div>
    );
  }
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon metric-${tone}`}><Icon name={icon} size={20}/></span></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, className = '', style = {} }) {
  return <span className={`mf-skeleton ${className}`} style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

export function MetricSkeletonGrid({ count = 4 }) {
  return (
    <div className="metrics-grid">
      {Array.from({ length: count }).map((_, i) => <StatCard key={i} loading />)}
    </div>
  );
}

export function OrderCardSkeletonList({ count = 3 }) {
  return (
    <div className="d-flex flex-column gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="order-list-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Skeleton width={120} height={18} />
            <Skeleton width={90} height={24} radius={7} />
          </div>
          <div className="d-flex flex-column gap-2 mb-3">
            <Skeleton width="85%" height={14} />
            <Skeleton width="70%" height={14} />
          </div>
          <div className="d-flex justify-content-between align-items-center pt-3 border-top">
            <Skeleton width={110} height={22} />
            <Skeleton width={115} height={38} radius={9} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="surface-body">
      <div className="d-flex flex-column gap-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="d-flex gap-3 align-items-center py-2 border-bottom">
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} width={`${Math.max(15, 100 / cols)}%`} height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({icon='package',title='Chưa có dữ liệu',description,action}){
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={28}/></span><h3>{title}</h3><p>{description||'Dữ liệu sẽ xuất hiện tại đây khi có hoạt động mới.'}</p>{action}</div>;
}

export function OrderRoute({pickup,dropoff,waypoints=[]}){
  return (
    <div className="route-addresses">
      <div className="route-entry"><span className="route-pin start"/><span className="ellipsis-2">{pickup||'Chưa có địa chỉ lấy hàng'}</span></div>
      {waypoints.map((wp, idx) => wp?.address ? (
        <div key={idx} className="route-entry"><span className="route-pin mid"/><span className="ellipsis-2">Điểm dừng {idx + 1}: {wp.address}</span></div>
      ) : null)}
      <div className="route-entry"><span className="route-pin end"/><span className="ellipsis-2">{dropoff||'Chưa có địa chỉ giao hàng'}</span></div>
    </div>
  );
}

export function OrderListTable({orders=[],empty='Không có đơn hàng phù hợp.', loading=false}){
  const navigate=useNavigate();
  if (loading) return <TableSkeleton rows={5} cols={4} />;
  return <>
    {/* Giao diện Bảng trên Desktop */}
    <div className="table-scroll desktop-only-table">
      <table className="data-table">
        <thead><tr><th>ĐƠN HÀNG</th><th>LỘ TRÌNH</th><th>TRẠNG THÁI</th><th>CƯỚC PHÍ</th><th></th></tr></thead>
        <tbody>
          {orders.length ? orders.map(o => (
            <tr key={o.id} onClick={()=>navigate(`/order/${o.id}`)} className="clickable-row">
              <td><strong className="order-number">#{o.id}</strong><small className="table-muted">{o.serviceName||o.serviceType}</small></td>
              <td className="route-cell"><OrderRoute pickup={o.pickup} dropoff={o.dropoff}/></td>
              <td><StatusBadge status={o.status}/></td>
              <td><strong>{money(o.totalPrice)}</strong></td>
              <td><Icon name="chevron" size={17}/></td>
            </tr>
          )) : <tr><td colSpan="5" className="text-center py-5 text-muted">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
    {/* Giao diện Thẻ (Card) tối ưu cho Điện thoại */}
    <div className="mobile-only-cards p-3 pt-0">
      {orders.length ? orders.map(o => (
        <article key={o.id} className="order-list-card mb-2" onClick={()=>navigate(`/order/${o.id}`)}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div><strong className="order-number">#{o.id}</strong> <small className="text-muted ms-1">· {o.serviceName||o.serviceType}</small></div>
            <StatusBadge status={o.status}/>
          </div>
          <OrderRoute pickup={o.pickup} dropoff={o.dropoff}/>
          <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
            <strong style={{color:'#ef742a', fontSize:14}}>{money(o.totalPrice)}</strong>
            <span className="small text-muted d-flex align-items-center gap-1">Chi tiết <Icon name="chevron" size={14}/></span>
          </div>
        </article>
      )) : <div className="text-center py-4 text-muted small">{empty}</div>}
    </div>
  </>;
}

export function downloadCsv(filename,rows){const cell=v=>`"${String(v??'').replaceAll('"','""')}"`;const csv='\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}