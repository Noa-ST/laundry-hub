import React, { useState, useEffect } from 'react';

const ServiceModal = ({ isOpen, onClose, onSave, initialData, isSaving, categories = [], units = [], onOpenManageUnits, onAddCategory }) => {
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [unitId, setUnitId] = useState('');
    const [priceType, setPriceType] = useState('FIXED');
    const [price, setPrice] = useState('');
    const [hasMinCharge, setHasMinCharge] = useState(false);
    const [minCharge, setMinCharge] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name || '');
                setCategoryId(initialData.category?.id || '');
                setUnitId(initialData.unit?.id || '');
                setPriceType(initialData.priceType || 'FIXED');
                setPrice(initialData.price || '');
                setHasMinCharge(!!initialData.minCharge);
                setMinCharge(initialData.minCharge || '');
                setDescription(initialData.description || '');
                setIsActive(initialData.isActive ?? true);
            } else {
                setName('');
                setCategoryId(categories.length > 0 ? categories[0].id : '');
                setUnitId(units.length > 0 ? units[0].id : '');
                setPriceType('FIXED');
                setPrice('');
                setHasMinCharge(false);
                setMinCharge('');
                setDescription('');
                setIsActive(true);
            }
        }
    }, [isOpen, initialData, categories, units]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const payload = { 
            name, 
            categoryId: categoryId ? parseInt(categoryId) : null,
            unitId: unitId ? parseInt(unitId) : null,
            priceType,
            description, 
            isActive 
        };

        if (priceType === 'FIXED') {
            payload.price = parseFloat(price);
            if (hasMinCharge && minCharge) {
                payload.minCharge = parseFloat(minCharge);
            }
        }
        
        onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{initialData ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-colors flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Tên dịch vụ</label>
                        <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Váy cưới cao cấp, Áo da..." className="w-full border-slate-200 rounded-xl text-sm p-3 bg-slate-50 border outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 transition-all" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Nhóm dịch vụ</label>
                                {onAddCategory && (
                                    <button type="button" onClick={onAddCategory} className="text-[10px] text-indigo-600 font-semibold hover:underline bg-indigo-50 px-2 py-0.5 rounded">+ Thêm</button>
                                )}
                            </div>
                            <select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="w-full border-slate-200 rounded-xl text-sm p-3 bg-slate-50 border outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 transition-all" required>
                                <option value="" disabled>Chọn nhóm</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Đơn vị tính</label>
                                <button type="button" onClick={onOpenManageUnits} className="text-[10px] text-indigo-600 font-semibold hover:underline bg-indigo-50 px-2 py-0.5 rounded">+ Thêm</button>
                            </div>
                            <select value={unitId} onChange={e=>setUnitId(e.target.value)} className="w-full border-slate-200 rounded-xl text-sm p-3 bg-slate-50 border outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 transition-all" required>
                                <option value="" disabled>Chọn đơn vị</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Hình thức tính giá</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button type="button" onClick={() => setPriceType('FIXED')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${priceType === 'FIXED' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Giá cố định</button>
                            <button type="button" onClick={() => setPriceType('CONTACT')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${priceType === 'CONTACT' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Liên hệ / Báo giá sau</button>
                        </div>
                    </div>

                    {priceType === 'FIXED' ? (
                        <div className="space-y-4 animate-fade-in border border-slate-100 bg-white p-4 rounded-xl shadow-sm">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Đơn giá</label>
                                <div className="relative">
                                    <input type="number" min="1000" step="1000" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0" className="w-full border-slate-200 rounded-xl text-sm p-3 pr-12 bg-slate-50 border outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 transition-all" required />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">đ</span>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <input type="checkbox" id="hasMinCharge" checked={hasMinCharge} onChange={e=>setHasMinCharge(e.target.checked)} className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 accent-slate-900" />
                                    <label htmlFor="hasMinCharge" className="text-sm font-medium text-slate-700 cursor-pointer">Thiết lập mức giá sàn tối thiểu</label>
                                </div>
                                {hasMinCharge && (
                                    <div className="relative mt-2 animate-fade-in pl-7">
                                        <input type="number" min="1000" step="1000" value={minCharge} onChange={e=>setMinCharge(e.target.value)} placeholder="VD: 40000" className="w-full border-slate-200 rounded-xl text-sm p-3 pr-12 bg-slate-50 border outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 transition-all" required />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">đ</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-sm text-amber-800 flex items-start space-x-3 animate-fade-in">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <p>Thích hợp cho các món đồ đặc biệt như thảm lông, áo dạ, đồ da cần kiểm tra trực tiếp trước khi báo giá.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Mô tả dịch vụ</label>
                        <textarea value={description} onChange={e=>setDescription(e.target.value)} rows="2" placeholder="Ghi chú thêm về dịch vụ này..." className="w-full border-slate-200 rounded-xl text-sm p-3 bg-slate-50 border outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 transition-all resize-none"></textarea>
                    </div>

                    {initialData && (
                        <div className="flex items-center space-x-3 pt-2">
                            <input type="checkbox" id="isActive" checked={isActive} onChange={e=>setIsActive(e.target.checked)} className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 accent-slate-900" />
                            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">Cho phép khách hàng đặt dịch vụ này</label>
                        </div>
                    )}

                    <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-6">
                        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">Hủy bỏ</button>
                        <button type="submit" disabled={isSaving || !name || (!categoryId) || (!unitId) || (priceType === 'FIXED' && !price)} className="flex-1 py-2.5 px-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors text-sm shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed">
                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ServiceModal;