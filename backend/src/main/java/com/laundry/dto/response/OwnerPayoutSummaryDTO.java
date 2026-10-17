package com.laundry.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class OwnerPayoutSummaryDTO {
    private BigDecimal pendingBalance;       // Tiền VietQR của các đơn hoàn tất đang chờ giải ngân
    private BigDecimal inProcessingBalance;  // Tiền đang trong đợt chờ Admin chuyển khoản
    private BigDecimal totalSettledBalance;   // Tổng tiền đã nhận thành công
    private LocalDate nextScheduledPayoutDate;// Ngày dự kiến giải ngân (Thứ Hai tới)
    @com.fasterxml.jackson.annotation.JsonProperty("isBankConfigured")
    private boolean isBankConfigured;        // Đã cập nhật ngân hàng chưa

    @com.fasterxml.jackson.annotation.JsonProperty("bankConfigured")
    public boolean getBankConfigured() {
        return isBankConfigured;
    }

    private String bankName;
    private String bankAccountNumber;
    private String bankAccountName;
}
