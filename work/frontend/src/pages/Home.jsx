import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { currentUser, homeFor } from '../api';
import { Icon } from '../ui/kit';
import './Home.css';

const services = [
  { number: '01', icon: 'package', title: 'Giao hàng xe máy', label: 'LINH HOẠT', description: 'Dành cho những kiện hàng gọn nhẹ và nhu cầu giao nhận hằng ngày.', features: ['Nhập điểm lấy và điểm giao', 'Theo dõi tiến trình đơn hàng'], tone: 'peach' },
  { number: '02', icon: 'truck', title: 'Vận chuyển xe tải', label: 'HÀNG CỒNG KỀNH', description: 'Lựa chọn phương tiện phù hợp khi cần vận chuyển nhiều hàng hoặc kiện lớn.', features: ['Lựa chọn dịch vụ theo loại xe', 'Kiểm tra cước phí dự kiến'], tone: 'blue' },
  { number: '03', icon: 'route', title: 'Vận chuyển container', label: 'HÀNG KHỐI LƯỢNG LỚN', description: 'Quản lý yêu cầu vận chuyển container trong cùng quy trình đặt và theo dõi đơn.', features: ['Tập trung thông tin vận đơn', 'Lịch sử trạng thái rõ ràng'], tone: 'mint' },
];

const workflow = [
  { step: '01', icon: 'map', title: 'Tạo yêu cầu', text: 'Nhập điểm lấy, điểm giao, chọn loại phương tiện và xem cước phí ước tính.' },
  { step: '02', icon: 'truck', title: 'Kết nối tài xế', text: 'Đơn được đưa vào hệ thống để tài xế phù hợp tiếp nhận và thực hiện.' },
  { step: '03', icon: 'check', title: 'Theo dõi đến khi hoàn tất', text: 'Kiểm tra các thay đổi trạng thái, liên hệ qua chat và xem thông tin đơn hàng.' },
];

function Brand({ light = false, onClick }) {
  return <Link className={`mf-brand ${light ? 'mf-brand-light' : ''}`} to="/" aria-label="MoveFlow - Trang chủ" onClick={onClick}>
    <span className="mf-brand-symbol"><Icon name="truck" size={22}/></span>
    <span className="mf-brand-type"><strong>move<span>flow</span></strong><small>LOGISTICS PLATFORM</small></span>
  </Link>;
}

function HeroGraphic() {
  return <div className="mf-hero-graphic" role="img" aria-label="Minh họa bảng theo dõi giao hàng, tuyến đường và các trạng thái đơn hàng">
    <div className="mf-graphic-halo mf-graphic-halo-one"/><div className="mf-graphic-halo mf-graphic-halo-two"/>
    <div className="mf-map-card">
      <div className="mf-map-head"><div className="mf-map-heading"><span className="mf-dot mf-dot-dark"/>THEO DÕI ĐƠN HÀNG <span className="mf-illustration-label">MINH HỌA</span></div><span className="mf-map-more">•••</span></div>
      <div className="mf-map-visual">
        <svg viewBox="0 0 500 264" width="100%" height="100%" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <rect width="500" height="264" fill="#f2f7f4"/>
          <g stroke="#fff" strokeWidth="15" fill="none" strokeLinecap="round">
            <path d="M-30 64 Q95 35 218 92 T540 80"/><path d="M-40 198 Q150 155 290 193 T550 162"/><path d="M60 -50 Q140 110 55 315"/><path d="M268 -50 Q212 95 302 300"/><path d="M440 -40 Q352 128 450 312"/>
          </g>
          <g stroke="#dae9e4" strokeWidth="1.5" fill="none"><path d="M0 125H500M0 240H500M112 0V264M390 0V264"/></g>
          <path d="M78 197 C111 195 139 203 161 162 S207 82 258 103 S326 175 366 142 S402 77 437 75" fill="none" stroke="#fca66d" strokeWidth="16" opacity=".28" strokeLinecap="round"/>
          <path d="M78 197 C111 195 139 203 161 162 S207 82 258 103 S326 175 366 142 S402 77 437 75" fill="none" stroke="#f36d2c" strokeWidth="5" strokeDasharray="2 10" strokeLinecap="round"/>
          <circle cx="78" cy="197" r="17" fill="#1b5960" stroke="white" strokeWidth="5"/><circle cx="78" cy="197" r="5" fill="white"/>
          <circle cx="437" cy="75" r="17" fill="#ff782e" stroke="white" strokeWidth="5"/><path d="m430 75 5 5 9-11" stroke="white" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <g transform="translate(245 118)"><circle r="26" fill="#fff" opacity=".85"/><circle r="20" fill="#fff" stroke="#fcd2b8" strokeWidth="2"/><rect x="-11" y="-9" width="17" height="13" rx="2" stroke="#f26f2d" strokeWidth="2.3" fill="none"/><path d="M6-4h6l4 6v4H6zM-5 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6M10 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6" stroke="#f26f2d" strokeWidth="2" fill="white"/></g>
        </svg>
        <span className="mf-map-location mf-map-location-pickup"><span/>Điểm lấy hàng</span>
        <span className="mf-map-location mf-map-location-drop"><span/>Điểm giao hàng</span>
      </div>
      <div className="mf-map-card-footer"><div><small>TRẠNG THÁI</small><strong><span className="mf-orange-dot"/> Đang giao hàng</strong></div><div><small>CẬP NHẬT</small><strong>Real-time · SignalR</strong></div></div>
    </div>
    <div className="mf-float-note mf-float-note-top"><span className="mf-float-icon"><Icon name="check" size={19}/></span><span><strong>Đơn được tiếp nhận</strong><small>Cập nhật trạng thái nhanh chóng</small></span></div>
    <div className="mf-float-note mf-float-note-bottom"><span className="mf-float-icon mf-float-icon-orange"><Icon name="route" size={19}/></span><span><strong>Hành trình rõ ràng</strong><small>Theo dõi từng bước vận chuyển</small></span></div>
  </div>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = currentUser();
  const signedIn = Boolean(user?.access_token);
  const dashboard = signedIn ? homeFor(user.role) : '/login';
  const booking = !signedIn ? '/login?next=%2Fbooking' : user.role === 'customer' ? '/booking' : homeFor(user.role);
  const close = () => setMenuOpen(false);
  return <div className="mf-site">
    <header className="mf-site-header">
      <div className="mf-site-container mf-header-inner">
        <Brand onClick={close}/>
        <nav className={`mf-nav ${menuOpen ? 'mf-nav-open' : ''}`} aria-label="Điều hướng trang chủ">
          <a href="#dich-vu" onClick={close}>Dịch vụ</a>
          <a href="#quy-trinh" onClick={close}>Cách hoạt động</a>
          <a href="#tinh-nang" onClick={close}>Tính năng</a>
          <a href="#doi-tac" onClick={close}>Đối tác tài xế</a>
          <div className="mf-mobile-account"><Link to={dashboard} onClick={close}>{signedIn ? 'Vào hệ thống' : 'Đăng nhập'}</Link><Link to={booking} onClick={close}>Đặt giao hàng</Link></div>
        </nav>
        <div className="mf-header-actions"><Link to={dashboard} className="mf-login-link">{signedIn ? 'Vào hệ thống' : 'Đăng nhập'}</Link><Link to={booking} className="mf-button mf-button-primary mf-header-cta">Đặt giao hàng <Icon name="arrow" size={16}/></Link></div>
        <button type="button" className="mf-menu-toggle" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}><Icon name={menuOpen ? 'x' : 'menu'} size={24}/></button>
      </div>
    </header>

    <main>
      <section className="mf-hero" aria-labelledby="mf-hero-title">
        <div className="mf-site-container mf-hero-inner">
          <div className="mf-hero-copy">
            <div className="mf-kicker"><span className="mf-kicker-burst">✦</span> NỀN TẢNG QUẢN LÝ VẬN CHUYỂN THÔNG MINH</div>
            <h1 id="mf-hero-title">Giao hàng dễ dàng.<br/><span>Mọi hành trình</span><br/>trong tầm tay.</h1>
            <p>Đặt dịch vụ vận chuyển, kết nối tài xế và theo dõi tiến độ giao hàng ngay trên một nền tảng. Đơn giản cho khách hàng, thuận tiện cho đối tác.</p>
            <div className="mf-hero-actions"><Link to={booking} className="mf-button mf-button-primary mf-button-large">Bắt đầu giao hàng <Icon name="arrow" size={20}/></Link><a href="#quy-trinh" className="mf-button mf-button-ghost mf-button-large">Khám phá cách hoạt động <Icon name="chevron" size={18}/></a></div>
            <div className="mf-hero-trust"><span className="mf-trust-icon"><Icon name="shield" size={19}/></span><span>Tài khoản phân quyền rõ ràng</span><span className="mf-trust-sep"/><span className="mf-trust-icon"><Icon name="lightning" size={18}/></span><span>Cập nhật theo thời gian thực</span></div>
          </div>
          <HeroGraphic/>
        </div>
      </section>

      <div className="mf-value-bar"><div className="mf-site-container mf-value-inner">
        <div><Icon name="map" size={22}/><span>Đặt đơn theo lộ trình</span></div>
        <div><Icon name="truck" size={23}/><span>Lựa chọn phương tiện</span></div>
        <div><Icon name="bell" size={22}/><span>Cập nhật đơn real-time</span></div>
        <div><Icon name="shield" size={22}/><span>Quản lý theo vai trò</span></div>
      </div></div>

      <section id="dich-vu" className="mf-section mf-services">
        <div className="mf-site-container">
          <div className="mf-section-top"><div><span className="mf-section-tag">DỊCH VỤ VẬN CHUYỂN</span><h2>Một nền tảng.<br/><span>Nhiều lựa chọn giao hàng.</span></h2></div><p>Từ những đơn hàng gọn nhẹ đến nhu cầu vận chuyển hàng lớn, chọn loại hình phù hợp và quản lý mọi đơn tại một nơi.</p></div>
          <div className="mf-service-grid">{services.map((service) => <article key={service.number} className="mf-service-card"><div className={`mf-service-visual mf-service-${service.tone}`}><span className="mf-service-index">{service.number} / MOVEFLOW</span><div className="mf-service-big-icon"><Icon name={service.icon} size={67}/></div><span className="mf-service-category">{service.label}</span></div><div className="mf-service-content"><h3>{service.title}</h3><p>{service.description}</p><ul>{service.features.map(f=><li key={f}><Icon name="check" size={15}/>{f}</li>)}</ul><Link to={booking} className="mf-service-link">Đặt dịch vụ <Icon name="arrow" size={17}/></Link></div></article>)}</div>
        </div>
      </section>

      <section id="quy-trinh" className="mf-section mf-how">
        <div className="mf-site-container"><div className="mf-center-heading"><span className="mf-section-tag">QUY TRÌNH ĐƠN GIẢN</span><h2>Giao hàng chỉ với <span>3 bước</span></h2><p>Một quy trình rõ ràng từ lúc tạo đơn đến khi hoàn thành.</p></div>
          <div className="mf-how-grid">{workflow.map((step,i)=><article className="mf-how-step" key={step.step}><div className="mf-how-icon"><Icon name={step.icon} size={30}/></div><span className="mf-how-number">BƯỚC {step.step}</span><h3>{step.title}</h3><p>{step.text}</p>{i!==2&&<span className="mf-how-arrow" aria-hidden="true"><Icon name="arrow" size={23}/></span>}</article>)}</div>
        </div>
      </section>

      <section id="tinh-nang" className="mf-section mf-feature-section"><div className="mf-site-container mf-feature-grid">
        <div className="mf-feature-preview"><div className="mf-preview-heading"><span className="mf-preview-square"><Icon name="dashboard" size={20}/></span><span><strong>Bảng điều khiển MoveFlow</strong><small>Giao diện minh họa · số liệu mẫu</small></span><span className="mf-preview-badge">LIVE UI</span></div>
          <div className="mf-preview-stats"><div><small>ĐƠN HÀNG</small><strong>128</strong></div><div><small>ĐANG GIAO</small><strong>24</strong></div><div><small>HOÀN THÀNH</small><strong>96</strong></div></div>
          <div className="mf-preview-chart"><div className="mf-preview-chart-top"><strong>Hoạt động vận chuyển</strong><span>7 ngày gần đây</span></div><svg viewBox="0 0 510 174" width="100%" aria-hidden="true"><g stroke="#e9eff0" strokeWidth="1"><path d="M0 20H510M0 65H510M0 110H510M0 155H510"/></g><defs><linearGradient id="mf-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fa7b35" stopOpacity=".22"/><stop offset="1" stopColor="#fa7b35" stopOpacity="0"/></linearGradient></defs><path d="M5 134C49 121 69 93 110 112S190 141 226 86S295 105 337 69S405 80 444 38S476 55 505 17L505 169H5Z" fill="url(#mf-chart-fill)"/><path d="M5 134C49 121 69 93 110 112S190 141 226 86S295 105 337 69S405 80 444 38S476 55 505 17" stroke="#f77a32" strokeWidth="4" fill="none" strokeLinecap="round"/></svg></div>
          <div className="mf-preview-orders"><div><span className="mf-preview-order-dot"/> Đơn hàng #MF00124 <strong>Đang giao</strong></div><div><span className="mf-preview-order-dot mf-green"/> Đơn hàng #MF00123 <strong>Hoàn thành</strong></div></div>
        </div>
        <div className="mf-feature-content"><span className="mf-section-tag">VẬN HÀNH THÔNG MINH</span><h2>Không chỉ đặt hàng.<br/><span>Còn quản lý dễ dàng.</span></h2><p>MoveFlow kết hợp chức năng tạo đơn và quản lý vận chuyển trên cùng hệ thống, với trải nghiệm riêng cho khách hàng, tài xế và quản trị viên.</p>
          <div className="mf-feature-list"><div><span><Icon name="lightning" size={22}/></span><div><strong>Trạng thái cập nhật thời gian thực</strong><p>SignalR truyền thông báo khi đơn được nhận và chuyển bước.</p></div></div><div><span><Icon name="map" size={22}/></span><div><strong>Thông tin giao nhận tập trung</strong><p>Địa chỉ, lộ trình, cước phí và lịch sử được trình bày dễ theo dõi.</p></div></div><div><span><Icon name="chart" size={22}/></span><div><strong>Bảng quản lý trực quan</strong><p>Theo dõi đơn hàng, thống kê vận hành và thông tin liên quan.</p></div></div></div>
          <Link to={dashboard} className="mf-text-action">{signedIn ? 'Mở bảng điều khiển' : 'Khám phá hệ thống'} <Icon name="arrow" size={18}/></Link>
        </div>
      </div></section>

      <section id="doi-tac" className="mf-section mf-partner-section"><div className="mf-site-container"><div className="mf-partner-panel"><div className="mf-partner-content"><span className="mf-section-tag">DÀNH CHO ĐỐI TÁC TÀI XẾ</span><h2>Chủ động nhận chuyến.<br/><span>Theo dõi công việc.</span></h2><p>Đăng ký tài khoản tài xế, quản lý danh sách đơn phù hợp và cập nhật tiến độ giao hàng ngay trên hệ thống.</p><Link to={signedIn?dashboard:'/register'} className="mf-button mf-button-white">{signedIn?'Vào hệ thống':'Đăng ký làm đối tác'} <Icon name="arrow" size={18}/></Link></div><div className="mf-partner-art" aria-hidden="true"><div className="mf-partner-wheel one"/><div className="mf-partner-wheel two"/><div className="mf-partner-truck"><Icon name="truck" size={115}/></div><div className="mf-partner-check"><Icon name="check" size={24}/></div></div></div></div></section>

      <section className="mf-final-cta"><div className="mf-site-container mf-final-cta-inner"><div><span className="mf-section-tag">BẮT ĐẦU CÙNG MOVEFLOW</span><h2>Sẵn sàng cho đơn hàng tiếp theo?</h2><p>Trải nghiệm quy trình giao nhận được tổ chức rõ ràng trên một nền tảng.</p></div><Link to={booking} className="mf-button mf-button-primary mf-button-large">Đặt giao hàng ngay <Icon name="arrow" size={19}/></Link></div></section>
    </main>
    <footer className="mf-footer"><div className="mf-site-container"><div className="mf-footer-top"><div><Brand light/><p>Nền tảng quản lý đơn hàng vận chuyển với ASP.NET Core và SignalR.</p></div><div className="mf-footer-links"><div><strong>Khám phá</strong><a href="#dich-vu">Dịch vụ</a><a href="#quy-trinh">Cách hoạt động</a><a href="#tinh-nang">Tính năng</a></div><div><strong>Tài khoản</strong><Link to={dashboard}>{signedIn ? 'Bảng điều khiển' : 'Đăng nhập'}</Link><Link to="/register">Đăng ký</Link><Link to={booking}>Đặt giao hàng</Link></div></div></div><div className="mf-footer-bottom"><span>© 2026 MoveFlow. Dự án nghiên cứu và demo học thuật.</span><span>Built with React · ASP.NET Core · SignalR</span></div></div></footer>
  </div>;
}
