import React,{useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {disconnectRealtime} from '../realtime';
import {Icon} from './kit';

const NAV={
 customer:[{title:'TỔNG QUAN',items:[['dashboard','/guest','Tổng quan'],['plus','/booking','Tạo đơn mới']]},{title:'QUẢN LÝ',items:[['package','/guest?tab=orders','Đơn hàng của tôi']]}],
 driver:[{title:'ĐIỀU PHỐI',items:[['dashboard','/driver','Bảng điều khiển'],['package','/driver?tab=available','Đơn đang mở'],['truck','/driver?tab=mine','Chuyến của tôi']]},{title:'TÀI CHÍNH',items:[['wallet','/wallet','Ví đối tác']]}],
 admin:[{title:'QUẢN TRỊ',items:[['dashboard','/admin','Tổng quan'],['package','/admin?tab=orders','Quản lý đơn'],['users','/admin?tab=users','Người dùng']]},{title:'TÀI CHÍNH',items:[['wallet','/wallet','Quản lý ví']]}]
};

const MOBILE_TABS={
 customer:[['dashboard','/guest','Tổng quan'],['plus','/booking','Đặt đơn'],['package','/guest?tab=orders','Đơn hàng']],
 driver:[['package','/driver?tab=available','Nhận chuyến'],['truck','/driver?tab=mine','Chuyến chạy'],['wallet','/wallet','Ví tài xế']],
 admin:[['dashboard','/admin','Tổng quan'],['package','/admin?tab=orders','Đơn hàng'],['users','/admin?tab=users','Tài khoản'],['wallet','/wallet','Quản lý ví']]
};

export default function AppShell({user,children}){
 const [open,setOpen]=useState(false);const loc=useLocation();const navigate=useNavigate();
 const role=user?.role==='admin'?'admin':user?.role?.startsWith('driver')?'driver':'customer';
 const onLogout=()=>{void disconnectRealtime();localStorage.removeItem('userInfo');navigate('/login',{replace:true})};
 const menu=NAV[role];const mobileTabs=MOBILE_TABS[role];
 const title=role==='admin'?'Trung tâm quản trị':role==='driver'?'Đối tác tài xế':'Không gian khách hàng';

 const isLinkActive = (href) => {
   const [path, q] = href.split('?');
   if (loc.pathname !== path) return false;
   if (q) return loc.search.includes(q);
   return !loc.search || (loc.search === '?tab=available' && href === '/driver');
 };

 return <div className="app-shell">
   {open&&<button className="sidebar-overlay" aria-label="Đóng menu" onClick={()=>setOpen(false)}/>}
   <aside className={`app-sidebar ${open?'sidebar-open':''}`}>
    <Link to={role==='admin'?'/admin':role==='driver'?'/driver':'/guest'} className="brand" onClick={()=>setOpen(false)}><span className="brand-mark"><Icon name="truck" size={23}/></span><span><b>MOVE<span className="brand-orange">FLOW</span></b><small>LOGISTICS PLATFORM</small></span></Link>
    <div className="sidebar-workspace"><span className="workspace-avatar"><Icon name="shield" size={18}/></span><span><small>KHÔNG GIAN LÀM VIỆC</small><b>{title}</b></span><Icon name="chevron" size={15}/></div>
    <nav className="sidebar-nav" aria-label="Điều hướng chính">{menu.map(section=><div key={section.title} className="sidebar-section"><div className="sidebar-label">{section.title}</div>{section.items.map(([icon,href,label])=>{const active=isLinkActive(href);return <Link key={href} to={href} className={`sidebar-link ${active?'active':''}`} onClick={()=>setOpen(false)}><Icon name={icon} size={19}/><span>{label}</span>{active&&<span className="active-rail"/>}</Link>})}</div>)}</nav>
    <div className="sidebar-bottom"><Link to="/" className="sidebar-link" onClick={()=>setOpen(false)}><Icon name="back" size={18}/> Về trang chủ</Link><div className="sidebar-help"><div className="help-icon"><Icon name="lightning" size={21}/></div><b>Vận hành thông minh</b><p>Đơn hàng được đồng bộ theo thời gian thực với SignalR.</p><span><span className="online-dot"/> ASP.NET Core + SignalR</span></div><button className="sidebar-link logout-link" onClick={onLogout}><Icon name="logout" size={19}/> Đăng xuất</button></div>
   </aside>
   <div className="app-main">
     <header className="app-topbar">
       <div className="topbar-left">
         <button className="icon-button mobile-menu" onClick={()=>setOpen(v=>!v)} aria-label="Mở menu"><Icon name="menu"/></button>
         <span className="breadcrumb-first">Workspace</span>
         <Icon name="chevron" size={14} className="breadcrumb-chevron"/>
         <b>{title}</b>
       </div>
       <div className="topbar-right">
         <span className="topbar-live"><span className="online-dot"/> Hệ thống trực tuyến</span>
         <span className="topbar-divider"/>
         <div className="account-avatar">{(user?.name||'U').trim().slice(0,1).toUpperCase()}</div>
         <div className="topbar-account"><b>{user?.name||'Người dùng'}</b><small>{role==='admin'?'Quản trị viên':role==='driver'?'Đối tác vận chuyển':'Khách hàng'}</small></div>
       </div>
     </header>
     <main className="app-content" key={loc.pathname}>{children}</main>
     <footer className="app-footer"><span>© 2026 MoveFlow · Nền tảng quản lý vận chuyển</span><span>Powered by ASP.NET Core & SignalR</span></footer>

     {/* Thanh điều hướng dưới đáy chuyên dụng cho Điện thoại */}
     <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
       {mobileTabs.map(([icon, href, label]) => {
         const active = isLinkActive(href);
         return (
           <Link key={href} to={href} className={`mobile-nav-item ${active ? 'active' : ''}`}>
             <Icon name={icon} size={20}/>
             <span>{label}</span>
           </Link>
         );
       })}
       <button type="button" className="mobile-nav-item" onClick={() => setOpen(true)}>
         <Icon name="menu" size={20}/>
         <span>Menu</span>
       </button>
     </nav>
   </div>
 </div>;
}