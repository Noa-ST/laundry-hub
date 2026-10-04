package com.laundry.dto.response;

import java.math.BigDecimal;

public record OwnerOrderSummaryDTO(
    Long pendingCount,
    Long processingCount,
    Long readyCount,
    Long completedCount,
    BigDecimal totalRevenue
) {}
