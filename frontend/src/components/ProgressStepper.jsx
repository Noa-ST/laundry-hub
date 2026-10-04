import React from 'react';

const ProgressStepper = ({ status, inboundMethod, outboundMethod }) => {
    let steps = [];
    const hasInboundShip = inboundMethod === 'STORE_PICKUP';
    const hasOutboundShip = outboundMethod === 'DELIVERY_TO_HOME';

    steps.push({ id: 'PENDING', label: 'Đặt đơn' });
    steps.push({ id: hasInboundShip ? 'PICKING_UP' : 'RECEIVED', label: hasInboundShip ? 'Lấy đồ' : 'Đã nhận đồ' });
    steps.push({ id: 'PROCESSING', label: 'Đang giặt' });
    steps.push({ id: hasOutboundShip ? 'DELIVERING' : 'READY', label: hasOutboundShip ? 'Đang ship' : 'Chờ ghé lấy' });
    steps.push({ id: 'COMPLETED', label: 'Thành công' });

    const statusOrder = ['PENDING', 'CONFIRMED', 'PICKING_UP', 'RECEIVED', 'PROCESSING', 'READY', 'DELIVERING', 'COMPLETED'];
    const currentIdx = statusOrder.indexOf(status);

    const getStepState = (stepId, index) => {
        if (status === 'CANCELLED') return 'cancelled';
        if (index === 0 && currentIdx >= 0) return 'completed';
        if (index === 1 && currentIdx >= (hasInboundShip ? 2 : 3)) return 'completed';
        if (index === 2 && currentIdx >= 4) return 'completed';
        if (index === 3 && currentIdx >= (hasOutboundShip ? 6 : 5)) return 'completed';
        if (index === 4 && currentIdx >= 7) return 'completed';
        return 'pending';
    };

    const getProgressWidth = () => {
        if (status === 'CANCELLED') return '0%';
        if (currentIdx >= 7) return '100%';
        if (currentIdx >= (hasOutboundShip ? 6 : 5)) return '75%';
        if (currentIdx >= 4) return '50%';
        if (currentIdx >= (hasInboundShip ? 2 : 3)) return '25%';
        return '0%';
    };

    return (
        <div className="w-full py-4 pb-6 mt-2 border-t border-gray-50 pt-5 px-4 md:px-8">
            <div className="flex items-center justify-between relative">
                <div className="absolute left-4 right-4 top-3 transform -translate-y-1/2 h-1 bg-gray-100 z-0 rounded-full">
                    <div className={`h-full ${status === 'CANCELLED' ? 'bg-red-500' : 'bg-indigo-500'} rounded-full transition-all duration-700 ease-in-out`} style={{ width: getProgressWidth() }}></div>
                </div>
                {steps.map((step, index) => {
                    const state = getStepState(step.id, index);
                    let circleColor = "bg-white border-gray-200 text-transparent shadow-sm";
                    let textColor = "text-gray-400";
                    
                    if (state === 'completed') {
                        circleColor = "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200";
                        textColor = "text-indigo-800 font-bold";
                    } else if (state === 'cancelled') {
                        circleColor = "bg-red-500 border-red-500 text-white shadow-md shadow-red-200";
                        textColor = "text-red-600 font-bold";
                    }

                    return (
                        <div key={index} className="relative z-10 flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] transition-all duration-500 z-10 relative ${circleColor}`}>
                                {state === 'completed' ? '✓' : (state === 'cancelled' ? '✕' : '')}
                            </div>
                            <span className={`text-[9px] md:text-[11px] mt-2 text-center absolute top-6 leading-tight whitespace-nowrap ${textColor}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProgressStepper;
