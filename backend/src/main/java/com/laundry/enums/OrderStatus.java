package com.laundry.enums;

/**
 * Trạng thái đơn hàng.
 * Mỗi trạng thái kèm nhãn tiếng Việt thân thiện để hiển thị cho người dùng cuối
 * (tuyệt đối không đẩy tên enum thô như "DELIVERING" ra giao diện/thông báo).
 */
public enum OrderStatus {
    PENDING("Chờ xác nhận",
            "Đơn hàng đang chờ xác nhận",
            "Đơn hàng %s đang chờ tiệm xác nhận."),
    CONFIRMED("Đã xác nhận",
            "Tiệm đã xác nhận đơn hàng",
            "Tiệm đã xác nhận đơn hàng %s của bạn."),
    PICKING_UP("Đang đến lấy đồ",
            "Tiệm đang đến lấy đồ",
            "Nhân viên tiệm đang trên đường đến lấy đồ cho đơn %s."),
    RECEIVED("Tiệm đã nhận đồ",
            "Tiệm đã nhận đồ của bạn",
            "Tiệm đã nhận đồ của đơn %s và sẽ sớm tiến hành giặt."),
    PROCESSING("Đang giặt",
            "Đồ của bạn đang được giặt",
            "Đơn hàng %s đang được giặt sấy."),
    READY("Đã giặt xong",
            "Đồ đã giặt xong",
            "Đơn hàng %s đã giặt xong và sẵn sàng để nhận."),
    DELIVERING("Đang giao hàng",
            "Đơn hàng đang được giao",
            "Đơn hàng %s đang được giao đến bạn."),
    COMPLETED("Hoàn thành",
            "Đơn hàng đã hoàn thành",
            "Đơn hàng %s đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ!"),
    CANCELLED("Đã hủy",
            "Đơn hàng đã bị hủy",
            "Đơn hàng %s đã bị hủy.");

    private final String label;
    private final String notificationTitle;
    private final String notificationTemplate;

    OrderStatus(String label, String notificationTitle, String notificationTemplate) {
        this.label = label;
        this.notificationTitle = notificationTitle;
        this.notificationTemplate = notificationTemplate;
    }

    /** Nhãn ngắn gọn bằng tiếng Việt, ví dụ: "Đang giao hàng". */
    public String getLabel() {
        return label;
    }

    /** Tiêu đề thông báo gửi cho khách hàng. */
    public String getNotificationTitle() {
        return notificationTitle;
    }

    /** Nội dung thông báo tự nhiên cho khách hàng, ví dụ: "Đơn hàng #ORD-0001 đang được giao đến bạn." */
    public String formatNotificationMessage(String orderCode) {
        return String.format(notificationTemplate, orderCode);
    }
}
