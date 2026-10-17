package com.laundry.enums;

public enum OrderPayoutStatus {
    UNSETTLED, // Chưa gom vào đợt giải ngân nào
    PENDING,   // Đang nằm trong đợt giải ngân chờ admin thanh toán
    SETTLED    // Đã giải ngân thành công cho shop
}
