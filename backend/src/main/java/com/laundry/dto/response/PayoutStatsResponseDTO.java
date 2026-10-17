package com.laundry.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PayoutStatsResponseDTO {
    private BigDecimal holdingBalance;       // Tiền VietQR của các đơn hoàn thành chưa giải ngân (UNSETTLED)
    private BigDecimal pendingPayoutAmount;  // Tiền các đợt PENDING đang chờ Admin xác nhận chuyển
    private BigDecimal completedPayoutAmount;// Tổng tiền đã giải ngân thành công từ trước đến nay
    private BigDecimal totalPlatformFee;     // Tổng hoa hồng sàn đã thu
    private int pendingBatchesCount;         // Số lượng đợt đang chờ giải ngân
}
