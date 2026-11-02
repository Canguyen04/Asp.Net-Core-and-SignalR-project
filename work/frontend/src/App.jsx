import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { currentUser, homeFor } from './api';
import AppShell from './ui/AppShell';
import Login from './pages/Login';
import Home from './pages/Home';
import Register from './pages/Register';
import Booking from './pages/Booking';
import OrderDetail from './pages/OrderDetail';
import WalletPage from './pages/WalletPage';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import CustomerDashboard from './pages/dashboards/CustomerDashboard';
import DriverDashboard from './pages/dashboards/DriverDashboard';
import DriverProfileAdmin from './pages/DriverProfileAdmin';
function Guard({allow,children}) {
 const user=currentUser();
 if(!user?.access_token) return <Navigate to="/login" replace/>;
 if(allow&&!allow(user.role)) return <Navigate to={homeFor(user.role)} replace/>;
 return <AppShell user={user}>{React.cloneElement(children,{userInfo:user})}</AppShell>;
}
const customer=r=>r==='customer',driver=r=>r?.startsWith('driver'),admin=r=>r==='admin';
export default function App(){return <Routes>
 <Route path="/" element={<Home/>}/>
 <Route path="/login" element={<Login/>}/>
 <Route path="/register" element={<Register/>}/>
 <Route path="/dashboard" element={<Navigate to={homeFor(currentUser()?.role)} replace/>}/>
 <Route path="/guest" element={<Guard allow={customer}><CustomerDashboard/></Guard>}/>
 <Route path="/driver" element={<Guard allow={driver}><DriverDashboard/></Guard>}/>
 <Route path="/admin" element={<Guard allow={admin}><AdminDashboard/></Guard>}/>
 <Route path="/admin/driver/:id" element={<Guard allow={admin}><DriverProfileAdmin/></Guard>}/>
 <Route path="/booking" element={<Guard allow={customer}><Booking/></Guard>}/>
 <Route path="/order/:id" element={<Guard><OrderDetail/></Guard>}/>
 <Route path="/wallet" element={<Guard><WalletPage/></Guard>}/>
 <Route path="*" element={<div className="empty-state"><h2>Không tìm thấy trang</h2><a href="/dashboard" className="btn btn-orange">Trở về tổng quan</a></div>}/>
</Routes>}
