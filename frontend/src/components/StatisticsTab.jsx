import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

const COLORS = ['#0d9488', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

const StatisticsTab = () => {
    const [period, setPeriod] = useState('7days');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await axiosClient.get(`/owner/statistics?period=${period}`);
                if (res.success) {
                    setStats(res.data);
                }
            } catch (error) {
                console.error("Lỗi khi tải thống kê", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [period]);

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

    if (loading || !stats) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const { kpis, revenueTrend, topServices, categoryRevenue, operationalBreakdown } = stats;

    return (
        <div className="space-y-6">
            {/* Header / Filter */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Thống Kê Kinh Doanh
                </h2>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                    {[
                        { id: '7days', label: '7 Ngày' },
                        { id: '30days', label: '30 Ngày' },
                        { id: 'thisMonth', label: 'Tháng này' },
                        { id: 'thisYear', label: 'Năm nay' }
                    ].map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${period === p.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* A. Executive KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-teal-50 rounded-full opacity-50"></div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Doanh thu (Net)</p>
                    <h3 className="text-2xl font-black text-slate-900">{formatMoney(kpis.netRevenue)} <span className="text-sm font-bold text-slate-500">đ</span></h3>
                    <div className={`mt-2 flex items-center text-xs font-bold ${kpis.revenueChangePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={kpis.revenueChangePercent >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                        </svg>
                        {Math.abs(kpis.revenueChangePercent)}% so với kỳ trước
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Số lượng đơn</p>
                    <h3 className="text-2xl font-black text-slate-900">{kpis.orderVolume} <span className="text-sm font-medium text-slate-400">đơn</span></h3>
                    <div className="mt-2 text-xs text-slate-500 flex justify-between">
                        <span>Hủy: <strong className="text-rose-500">{kpis.cancelCount}</strong></span>
                        <span>Tỷ lệ hủy: <strong>{kpis.cancelRate}%</strong></span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">AOV (Giá trị TB đơn)</p>
                    <h3 className="text-2xl font-black text-slate-900">{formatMoney(kpis.averageOrderValue)} <span className="text-sm font-bold text-slate-500">đ</span></h3>
                    <div className="mt-2 text-[11px] text-slate-500">Chi tiêu trung bình của khách hàng / lần giặt</div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sản lượng đã xử lý</p>
                    <h3 className="text-2xl font-black text-slate-900">{kpis.totalVolumeKg} <span className="text-sm font-medium text-slate-400">kg</span></h3>
                    <div className="mt-2 text-xs text-slate-500">
                        Và <strong className="text-slate-700">{kpis.totalVolumeItems}</strong> món đồ/cái/bộ khác
                    </div>
                </div>
            </div>

            {/* B. Revenue Trend Chart */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Biểu đồ Doanh Thu</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Theo dõi doanh thu thực nhận và số lượng đơn hàng theo thời gian</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                            Doanh thu (VNĐ)
                        </span>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueTrend} margin={{ top: 10, right: 20, left: 5, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.6} />
                            <XAxis 
                                dataKey="label" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#64748b' }} 
                                dy={10} 
                                padding={{ left: 16, right: 16 }}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#64748b' }} 
                                tickFormatter={(value) => `${value / 1000}k`} 
                                dx={-10}
                            />
                            <Tooltip 
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const item = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[170px] backdrop-blur-sm animate-fade-in">
                                                <div className="text-[11px] font-bold text-slate-300 border-b border-slate-700/80 pb-1 flex items-center justify-between">
                                                    <span>Mốc ngày</span>
                                                    <span className="font-mono text-white">{label}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-200 pt-0.5">
                                                    <span>Doanh thu:</span>
                                                    <span className="font-extrabold text-teal-400">{formatMoney(item.revenue)} đ</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-200">
                                                    <span>Số đơn:</span>
                                                    <span className="font-bold text-amber-300">{item.orderCount || 0} đơn</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* C & D. Services & Operational Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Top Services */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Top Dịch Vụ Mang Lại Doanh Thu Cao Nhất</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topServices} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="serviceName" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 11, fill: '#475569' }} />
                                <Tooltip 
                                    formatter={(value) => [`${formatMoney(value)} đ`, 'Doanh thu']}
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
                                    {topServices.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart - Category */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 mb-2">Tỷ trọng theo Nhóm Dịch Vụ</h3>
                    <div className="flex-1 w-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryRevenue}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="revenue"
                                    nameKey="categoryName"
                                >
                                    {categoryRevenue.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${formatMoney(value)} đ`} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Operational Breakdown */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-3">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Phân Tích Vận Hành</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Channel */}
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kênh Tiếp Nhận</h4>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-700">Ứng dụng (App)</span>
                                <span className="text-sm font-bold text-slate-900">{operationalBreakdown.channel.app}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3">
                                <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${(operationalBreakdown.channel.app / (operationalBreakdown.channel.app + operationalBreakdown.channel.pos || 1)) * 100}%` }}></div>
                            </div>

                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-700">Tại quầy (POS)</span>
                                <span className="text-sm font-bold text-slate-900">{operationalBreakdown.channel.pos}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div className="bg-slate-900 h-1.5 rounded-full" style={{ width: `${(operationalBreakdown.channel.pos / (operationalBreakdown.channel.app + operationalBreakdown.channel.pos || 1)) * 100}%` }}></div>
                            </div>
                        </div>

                        {/* Delivery */}
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Giao Nhận</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Khách tự mang tới:</span>
                                    <strong className="text-slate-800">{operationalBreakdown.delivery.customerDropOff}</strong>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Tiệm đi lấy:</span>
                                    <strong className="text-slate-800">{operationalBreakdown.delivery.shopPickUp}</strong>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Khách tự tới lấy:</span>
                                    <strong className="text-slate-800">{operationalBreakdown.delivery.customerPickUp}</strong>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Tiệm giao tận nơi:</span>
                                    <strong className="text-slate-800">{operationalBreakdown.delivery.shopDelivery}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Payment */}
                        {(() => {
                            const cashRev = operationalBreakdown?.payment?.cashRevenue || 0;
                            const vietQrRev = operationalBreakdown?.payment?.vietQrRevenue || 0;
                            const totalPaymentRev = cashRev + vietQrRev;
                            const cashCount = operationalBreakdown?.payment?.cash || 0;
                            const vietQrCount = operationalBreakdown?.payment?.vietQr || 0;
                            const totalPaymentCount = cashCount + vietQrCount;

                            let cashPct = 0;
                            let vietQrPct = 0;
                            if (totalPaymentRev > 0) {
                                cashPct = Math.round((cashRev / totalPaymentRev) * 100);
                                vietQrPct = 100 - cashPct;
                            } else if (totalPaymentCount > 0) {
                                cashPct = Math.round((cashCount / totalPaymentCount) * 100);
                                vietQrPct = 100 - cashPct;
                            }

                            return (
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phương thức thanh toán</h4>
                                        <span className="text-[11px] font-semibold text-slate-400">
                                            Tổng: {formatMoney(totalPaymentRev)} đ
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden flex mb-3 shadow-inner">
                                        <div 
                                            className="bg-amber-500 h-full transition-all duration-500" 
                                            style={{ width: `${cashPct}%` }}
                                            title={`Tiền mặt: ${cashPct}%`}
                                        ></div>
                                        <div 
                                            className="bg-indigo-600 h-full transition-all duration-500" 
                                            style={{ width: `${vietQrPct}%` }}
                                            title={`VietQR: ${vietQrPct}%`}
                                        ></div>
                                    </div>

                                    {/* Badges */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                                                <span className="text-xs font-bold text-slate-700">Tiền mặt:</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-900">{formatMoney(cashRev)} đ</span>
                                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                                    {cashPct}%
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-medium">({cashCount} đơn)</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
                                                <span className="text-xs font-bold text-slate-700">VietQR:</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-900">{formatMoney(vietQrRev)} đ</span>
                                                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                                                    {vietQrPct}%
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-medium">({vietQrCount} đơn)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                    </div>
                </div>

            </div>
        </div>
    );
};

export default StatisticsTab;
