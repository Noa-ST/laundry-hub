/**
 * Geolocation options and error handling for mobile and desktop browsers.
 */

export const GEOLOCATION_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
};

export const handleGeolocationError = (error) => {
    let alertMessage = "";
    switch (error?.code) {
        case 1: // error.PERMISSION_DENIED
            alertMessage = "Quyền truy cập vị trí bị từ chối (Code 1: Permission denied).\nVui lòng cho phép quyền truy cập vị trí trong cài đặt trình duyệt để tìm kiếm dịch vụ quanh bạn.";
            break;
        case 2: // error.POSITION_UNAVAILABLE
            alertMessage = "Không thể xác định vị trí (Code 2: Position unavailable / GPS off).\nVui lòng kiểm tra lại thiết bị xem GPS hoặc dịch vụ định vị đã được bật chưa.";
            break;
        case 3: // error.TIMEOUT
            alertMessage = "Quá thời gian lấy vị trí (Code 3: Timeout).\nĐã vượt quá thời gian chờ (15 giây). Vui lòng thử lại ở nơi có tín hiệu GPS tốt hơn.";
            break;
        default:
            alertMessage = `Lỗi xác định vị trí: ${error?.message || "Không xác định"}. Vui lòng thử lại.`;
            break;
    }
    alert(alertMessage);
    return alertMessage;
};
