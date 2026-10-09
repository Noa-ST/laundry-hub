import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import ServiceModal from './ServiceModal';
import ManageUnitsModal from './ManageUnitsModal';
import ManageCategoriesModal from './ManageCategoriesModal';
import toast from 'react-hot-toast';

const ServiceManagementTab = () => {
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [activeCategoryId, setActiveCategoryId] = useState(null); // null means 'Tất cả'
    
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isManageUnitsModalOpen, setIsManageUnitsModalOpen] = useState(false);
    const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
    
    const [editingService, setEditingService] = useState(null);
    const [isSavingService, setIsSavingService] = useState(false);

    const fetchCategoriesAndUnits = async () => {
        try {
            const [catRes, unitRes] = await Promise.all([
                axiosClient.get('/owner/categories'),
                axiosClient.get('/owner/units')
            ]);
            if (catRes) setCategories(catRes.data || catRes);
            if (unitRes) setUnits(unitRes.data || unitRes);
        } catch (error) {
            console.error("Failed to fetch categories/units", error);
        }
    };

    const fetchServices = async () => {
        try {
            setLoading(true);
            const url = activeCategoryId ? `/owner/services?categoryId=${activeCategoryId}` : '/owner/services';
            const res = await axiosClient.get(url);
            if (res) {
                setServices(res.data || res);
            }
        } catch (error) {
            console.error("Failed to fetch services", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategoriesAndUnits();
    }, []);

    useEffect(() => {
        fetchServices();
    }, [activeCategoryId]);

    const handleSaveService = async (serviceData) => {
        try {
            setIsSavingService(true);
            if (editingService) {
                await axiosClient.put(`/owner/services/${editingService.id}`, serviceData);
            } else {
                await axiosClient.post('/owner/services', serviceData);
            }
            setIsServiceModalOpen(false);
            fetchServices();
        } catch (err) {
            toast.error('Lỗi lưu dịch vụ. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setIsSavingService(false);
        }
    };

    const handleDeleteService = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này không? (Dịch vụ sẽ được ẩn đi nếu đã có đơn hàng)")) {
            try {
                await axiosClient.delete(`/owner/services/${id}`);
                fetchServices();
            } catch (err) {
                toast.error('Lỗi xóa dịch vụ');
            }
        }
    };

    const handleAddCategory = () => {
        setIsManageCategoriesModalOpen(true);
    };

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const categoriesData = Array.isArray(categories) ? categories : [];
    const servicesData = Array.isArray(services) ? services : [];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full flex flex-col">
            {/* Header & Tools */}
            <div className="p-6 border-b border-slate-100 bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Danh mục Dịch vụ</h2>
                        <p className="text-slate-500 text-sm mt-1">Đang hiển thị {servicesData.length} dịch vụ</p>
                    </div>
                    <div className="flex space-x-3">
                        <button 
                            onClick={() => setIsManageUnitsModalOpen(true)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                        >
                            Quản lý Đơn vị
                        </button>
                        <button 
                            onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }} 
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm"
                        >
                            + Thêm dịch vụ
                        </button>
                    </div>
                </div>

                {/* Categories Pills */}
                <div className="flex space-x-2 overflow-x-auto custom-scrollbar pb-2">
                    <button
                        onClick={() => setActiveCategoryId(null)}
                        className={`whitespace-nowrap transition-colors rounded-lg text-xs px-3 py-1.5 ${
                            activeCategoryId === null
                            ? 'bg-slate-900 text-white font-medium shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium'
                        }`}
                    >
                        Tất cả
                    </button>
                    {categoriesData.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveCategoryId(c.id)}
                            className={`whitespace-nowrap transition-colors rounded-lg text-xs px-3 py-1.5 ${
                                activeCategoryId === c.id
                                ? 'bg-slate-900 text-white font-medium shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium'
                            }`}
                        >
                            {c.name}
                        </button>
                    ))}
                    <button
                        onClick={handleAddCategory}
                        className="whitespace-nowrap transition-colors rounded-lg text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium border border-indigo-100 border-dashed"
                    >
                        + Thêm nhóm
                    </button>
                </div>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Tên dịch vụ & Nhóm</th>
                            <th className="px-6 py-4">Đơn vị tính</th>
                            <th className="px-6 py-4">Đơn giá</th>
                            <th className="px-6 py-4 text-center">Trạng thái</th>
                            <th className="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, idx) => (
                                <tr key={idx} className="animate-pulse">
                                    <td className="px-6 py-4">
                                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                    </td>
                                    <td className="px-6 py-4"><div className="h-5 bg-slate-100 rounded w-12"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-slate-100 rounded-full w-20 mx-auto"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                                </tr>
                            ))
                        ) : servicesData.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-500 bg-slate-50/50">
                                    <p className="text-sm font-medium">Chưa có dịch vụ nào trong nhóm này.</p>
                                </td>
                            </tr>
                        ) : (
                            servicesData.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-900">{s.name}</p>
                                        {s.category && <span className="text-[11px] text-slate-500 font-medium">{s.category.name}</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {s.unit ? (
                                            <span className="border border-slate-200 bg-slate-50 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">
                                                {s.unit.name}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {s.priceType === 'FIXED' ? (
                                            <div>
                                                <span className="font-bold text-slate-900">{formatMoney(s.price)}</span>
                                                {s.minCharge && (
                                                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Tối thiểu {formatMoney(s.minCharge)}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                                                Liên hệ / Báo giá
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {s.isActive ? 'Đang nhận' : 'Tạm ẩn'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        <button onClick={() => { setEditingService(s); setIsServiceModalOpen(true); }} className="text-indigo-600 hover:underline font-semibold text-xs transition-colors">Sửa</button>
                                        <button onClick={() => handleDeleteService(s.id)} className="text-rose-600 hover:underline font-semibold text-xs transition-colors">Xóa</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ServiceModal
                isOpen={isServiceModalOpen}
                onClose={() => setIsServiceModalOpen(false)}
                onSave={handleSaveService}
                initialData={editingService}
                isSaving={isSavingService}
                categories={categoriesData}
                units={units}
                onOpenManageUnits={() => setIsManageUnitsModalOpen(true)}
                onAddCategory={handleAddCategory}
            />

            <ManageUnitsModal
                isOpen={isManageUnitsModalOpen}
                onClose={() => {
                    setIsManageUnitsModalOpen(false);
                    fetchCategoriesAndUnits();
                }}
            />

            <ManageCategoriesModal
                isOpen={isManageCategoriesModalOpen}
                onClose={() => {
                    setIsManageCategoriesModalOpen(false);
                    fetchCategoriesAndUnits();
                }}
            />
        </div>
    );
};

export default ServiceManagementTab;
