import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const ManageCategoriesModal = ({ isOpen, onClose }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/owner/categories');
            if (res) {
                setCategories(res.data || res);
            }
        } catch (error) {
            console.error("Failed to fetch categories", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            setIsAdding(true);
            const newDisplayOrder = categories.length > 0 ? Math.max(...categories.map(c => c.displayOrder || 0)) + 1 : 1;
            await axiosClient.post('/owner/categories', { name: newCategoryName.trim(), displayOrder: newDisplayOrder });
            setNewCategoryName('');
            fetchCategories();
        } catch (error) {
            alert('Lỗi thêm nhóm dịch vụ');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Bạn có chắc chắn xóa nhóm này? Dịch vụ trong nhóm sẽ bị xóa hoặc ảnh hưởng!")) return;
        try {
            await axiosClient.delete(`/owner/categories/${id}`);
            fetchCategories();
        } catch (error) {
            alert(error.response?.data?.message || 'Lỗi xóa nhóm dịch vụ. Có thể đang có dịch vụ sử dụng nhóm này.');
        }
    };

    if (!isOpen) return null;

    const categoriesData = Array.isArray(categories) ? categories : (categories?.data || []);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Quản lý Nhóm dịch vụ</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-colors flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto max-h-96 custom-scrollbar">
                    {loading ? (
                        <div className="text-center text-sm text-slate-500 py-4">Đang tải...</div>
                    ) : (
                        <div className="space-y-3">
                            {categoriesData.length === 0 ? (
                                <div className="text-center text-xs text-slate-500 italic">Chưa có nhóm dịch vụ nào.</div>
                            ) : (
                                categoriesData.map(c => (
                                    <div key={c.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-xl">
                                        <span className="font-semibold text-slate-700 text-sm">{c.name}</span>
                                        <button onClick={() => handleDeleteCategory(c.id)} className="text-rose-500 hover:text-rose-700 text-xs font-semibold p-1 transition-colors">Xóa</button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50">
                    <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input 
                            type="text" 
                            value={newCategoryName} 
                            onChange={(e) => setNewCategoryName(e.target.value)} 
                            placeholder="Nhập tên nhóm mới..." 
                            className="flex-1 border-slate-200 rounded-xl text-sm p-3 bg-white border outline-none focus:ring-1 focus:ring-slate-900 transition-all" 
                            required 
                        />
                        <button 
                            type="submit" 
                            disabled={isAdding || !newCategoryName.trim()} 
                            className="bg-slate-900 text-white rounded-xl px-4 font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
                        >
                            Thêm
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ManageCategoriesModal;
