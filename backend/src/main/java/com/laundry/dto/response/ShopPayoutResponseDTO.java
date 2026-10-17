package com.laundry.dto.response;

import com.laundry.enums.PayoutStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ShopPayoutResponseDTO {
    private Long id;
    private Long shopId;
    private String shopName;
    private String shopPhone;
    private String ownerName;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private Integer totalOrders;
    private BigDecimal grossAmount;
    private Double platformFeeRate;
    private BigDecimal platformFeeAmount;
    private BigDecimal netPayoutAmount;
    private PayoutStatus status;
    private String proofImageUrl;
    private String note;
    private LocalDateTime paidAt;
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountName;
    private LocalDateTime createdAt;
}
