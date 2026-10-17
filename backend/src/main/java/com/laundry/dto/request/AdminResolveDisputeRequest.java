package com.laundry.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminResolveDisputeRequest {
    @NotNull(message = "Decision is required")
    private Boolean acceptRefund;
    
    private com.laundry.enums.RefundMethod refundMethod;
    private String refundProofUrl;
    
    private String adminDecisionNote;
}
