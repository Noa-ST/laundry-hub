package com.laundry.dto.request;

import com.laundry.enums.DisputeReason;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateDisputeRequest {
    @NotNull(message = "Reason is required")
    private DisputeReason reason;
    
    private String description;
    
    private List<String> evidenceUrls;
    
    private BigDecimal requestedAmount;
    
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountName;
}
