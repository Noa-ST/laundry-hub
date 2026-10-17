package com.laundry.dto.response;

import com.laundry.enums.DisputeReason;
import com.laundry.enums.DisputeStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class DisputeResponse {
    private Long id;
    private Long orderId;
    private Long customerId;
    private Long shopId;
    private DisputeReason reason;
    private String description;
    private List<String> evidenceUrls;
    private DisputeStatus status;
    private BigDecimal requestedAmount;
    private BigDecimal acceptedAmount;
    private com.laundry.enums.RefundMethod refundMethod;
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountName;
    private String refundProofUrl;
    private String compensationVoucherCode;
    private String shopResponseNote;
    private List<String> shopEvidenceUrls;
    private String adminDecisionNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
