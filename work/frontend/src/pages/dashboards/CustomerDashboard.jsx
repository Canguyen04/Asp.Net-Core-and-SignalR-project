import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../api';
import { subscribeRealtime } from '../../realtime';
import SupportWidget from '../../components/SupportWidget';
import { Icon, PageHeader, StatCard, EmptyState, OrderListTable, MetricSkeletonGrid, money } from '../../ui/kit';

export default function CustomerDashboard({ userInfo }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const refresh = async () => {
    try {
      setOrders((await api.get('/orders')).data);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    return subscribeRealtime(userInfo, ({ event }) => {
      if (['order_created', 'status_changed'].includes(event)) refresh();
    });
  }, [userInfo.user_id]);

  const ongoing = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
  const completed = orders.filter(o => o.status === 'completed');

  const filtered = useMemo(() => orders.filter(o => {
    const text = `${o.id} ${o.pickup} ${o.dropoff} ${o.serviceName}`.toLowerCase();
    return (
      status === 'all' ||
      (status === 'active' ? !['completed', 'cancelled'].includes(o.status) : o.status === status)
    ) && text.includes(search.trim().toLowerCase());
  }), [orders, search, status]);

  const showOrders = params.get('tab') === 'orders';

  return (
    <>
      <PageHeader
        eyebrow="KHÁCH HÀNG / DASHBOARD"
        title={showOrders ? 'Đơn hàng của tôi' : `Chào ${userInfo.name?.split(' ').slice(-1)[0] || 'bạn'}! 👋`}
        description={showOrders ? 'Tìm kiếm, lọc và theo dõi toàn bộ các đơn vận chuyển của bạn.' : 'Quản lý đơn hàng và theo dõi hành trình vận chuyển tại một nơi.'}
        actions={
          <button className="btn btn-orange d-flex gap-2 align-items-center" onClick={() => navigate('/booking')}>
            <Icon name="plus" size={17} /> Tạo đơn giao hàng
          </button>
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}

      {!showOrders && (
        <>
          <div className="overview-highlight mb-4">
            <div className="eyebrow" style={{ color: '#ffe4cf' }}>GIAO HÀNG DỄ DÀNG HƠN</div>
            <h2>Mọi chuyến giao, trong tầm kiểm soát của bạn.</h2>
            <p>Tạo đơn trong vài bước, thêm nhiều điểm giao linh hoạt, theo dõi trạng thái tự động và trao đổi trực tiếp với tài xế.</p>
            <button onClick={() => navigate('/booking')} className="btn d-inline-flex align-items-center gap-2">
              <Icon name="plus" size={17} /> Đặt giao hàng ngay
            </button>
          </div>

          {loading ? (
            <MetricSkeletonGrid count={4} />
          ) : (
            <div className="metrics-grid">
              <StatCard label="Tổng đơn hàng" value={orders.length} icon="package" note="Toàn bộ đơn đã tạo" />
              <StatCard label="Đang xử lý" value={ongoing.length} icon="truck" tone="blue" note="Đang chờ hoặc giao hàng" />
              <StatCard label="Hoàn thành" value={completed.length} icon="check" tone="green" note="Giao hàng thành công" />
              <StatCard label="Tổng cước đã giao" value={money(completed.reduce((a, o) => a + Number(o.totalPrice || 0), 0))} icon="wallet" tone="purple" note="Từ các đơn hoàn thành" />
            </div>
          )}
        </>
      )}

      <section className="surface-card">
        <div className="panel-head flex-wrap">
          <div>
            <h2>{showOrders ? 'Danh sách đơn hàng' : 'Đơn hàng gần đây'}</h2>
            <p>{showOrders ? 'Tra cứu thông tin vận chuyển và trạng thái.' : 'Các hoạt động giao hàng mới nhất của bạn.'}</p>
          </div>
          {!showOrders && (
            <button className="btn btn-outline-light d-flex gap-2 align-items-center" onClick={() => setParams({ tab: 'orders' })}>
              Xem tất cả <Icon name="arrow" size={15} />
            </button>
          )}
        </div>

        <div className="surface-body pb-0">
          <div className="filter-row">
            <label className="filter-input w-100-mobile">
              <Icon name="search" size={17} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm mã đơn, địa chỉ, cảng, dịch vụ..."
                aria-label="Tìm kiếm đơn hàng"
              />
            </label>
            <select
              className="filter-select w-100-mobile"
              aria-label="Lọc trạng thái"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang xử lý</option>
              <option value="pending">Chờ tài xế</option>
              <option value="delivering">Đang giao hàng</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <button className="btn btn-outline-light d-flex gap-2 align-items-center w-100-mobile justify-content-center" onClick={refresh}>
              <Icon name="refresh" size={15} /> Làm mới
            </button>
          </div>
        </div>

        {loading ? (
          <OrderListTable loading={true} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Bạn chưa có đơn hàng"
            description="Bắt đầu bằng cách tạo một đơn vận chuyển mới."
            action={
              <button className="btn btn-orange" onClick={() => navigate('/booking')}>
                Tạo đơn đầu tiên
              </button>
            }
          />
        ) : (
          <OrderListTable orders={showOrders ? filtered : filtered.slice(0, 7)} />
        )}
      </section>

      <SupportWidget userInfo={userInfo} />
    </>
  );
}