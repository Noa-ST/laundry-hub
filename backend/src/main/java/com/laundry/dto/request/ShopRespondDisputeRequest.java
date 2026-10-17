package com.laundry.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ShopRespondDisputeRequest {
    @NotNull(message = "Decision is required")
    private Boolean acceptRefund; // true = đồng ý hoàn tiền, false = từ chối
    
    private BigDecimal acceptedAmount; // Bắt buộc nếu acceptRefund = true
    
    private com.laundry.enums.RefundMethod refundMethod; // BANK_TRANSFER hoặc VOUCHER
    
    private String refundProofUrl; // Ảnh bill chuyển khoản nếu BANK_TRANSFER
    
    private String shopResponseNote;
    
    private List<String> shopEvidenceUrls;
}
