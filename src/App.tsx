import { Routes, Route, Navigate } from 'react-router'
import PublicLayout from './components/PublicLayout'
import Home from './pages/Home'
import CourseDetail from './pages/CourseDetail'
import Promo from './pages/Promo'
import Login from './pages/Login'
import Register from './pages/Register'
import Checkout from './pages/Checkout'
import OrderComplete from './pages/OrderComplete'
import MemberDashboard from './pages/member/MemberDashboard'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMembers from './pages/admin/AdminMembers'
import AdminOrders from './pages/admin/AdminOrders'
import AdminRefunds from './pages/admin/AdminRefunds'
import AdminRebates from './pages/admin/AdminRebates'
import AdminInquiries from './pages/admin/AdminInquiries'
import AdminSessions from './pages/admin/AdminSessions'
import AdminAttendance from './pages/admin/AdminAttendance'
import AdminAnnouncements from './pages/admin/AdminAnnouncements'
import AdminPromo from './pages/admin/AdminPromo'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/course/:stage" element={<CourseDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/checkout/:stage" element={<Checkout />} />
        <Route path="/order/:orderId" element={<OrderComplete />} />
        <Route path="/member" element={<MemberDashboard />} />
      </Route>
      <Route path="/p/:code" element={<Promo />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="refunds" element={<AdminRefunds />} />
        <Route path="rebates" element={<AdminRebates />} />
        <Route path="inquiries" element={<AdminInquiries />} />
        <Route path="sessions" element={<AdminSessions />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="promo" element={<AdminPromo />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
