import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const ManageUnitsModal = ({ isOpen, onClose }) => {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUnitName, setNewUnitName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const fetchUnits = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/owner/units');
            if (res) {
                // Assume axiosClient unpacks data if success
                setUnits(res.data || res);
            }
        } catch (error) {
            console.error("Failed to fetch units", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchUnits();
        }
    }, [isOpen]);

    const handleAddUnit = async (e) => {
        e.preventDefault();
        if (!newUnitName.trim()) return;
        try {
            setIsAdding(true);
            await axiosClient.post('/owner/units', { name: newUnitName.trim() });
            setNewUnitName('');
            fetchUnits();
        } catch (error) {
            alert('Lỗi thêm đơn vị');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteUnit = async (id) => {
        if (!window.confirm("Xóa đơn vị này?")) return;
        try {
            await axiosClient.delete(`/owner/units/${id}`);
            fetchUnits();
        } catch (error) {
            alert(error.response?.data?.message || 'Lỗi xóa đơn vị');
        }
    };

    if (!isOpen) return null;

    // Adjusting for response format differences if any
    const unitsData = Array.isArray(units) ? units : (units?.data || []);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Quản lý Đơn vị tính</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-colors flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto max-h-96 custom-scrollbar">
                    {loading ? (
                        <div className="text-center text-sm text-slate-500 py-4">Đang tải...</div>
                    ) : (
                        <div className="space-y-3">
                            {unitsData.map(u => (
                                <div key={u.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-xl">
                                    <span className="font-semibold text-slate-700 text-sm">{u.name}</span>
                                    {!u.isDefault ? (
                                        <button onClick={() => handleDeleteUnit(u.id)} className="text-rose-500 hover:text-rose-700 text-xs font-semibold p-1 transition-colors">Xóa</button>
                                    ) : (
                                        <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Mặc định</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50">
                    <form onSubmit={handleAddUnit} className="flex gap-2">
                        <input 
                            type="text" 
                            value={newUnitName} 
                            onChange={(e) => setNewUnitName(e.target.value)} 
                            placeholder="Nhập tên đơn vị..." 
                            className="flex-1 border-slate-200 rounded-xl text-sm p-3 bg-white border outline-none focus:ring-1 focus:ring-slate-900 transition-all" 
                            required 
                        />
                        <button 
                            type="submit" 
                            disabled={isAdding || !newUnitName.trim()} 
                            className="bg-slate-900 text-white rounded-xl px-4 font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            Thêm
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ManageUnitsModal;
