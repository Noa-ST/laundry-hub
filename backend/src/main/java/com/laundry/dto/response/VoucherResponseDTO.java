package com.laundry.dto.response;

import java.time.LocalDateTime;

public record VoucherResponseDTO(
    Long id,
    String code,
    String discountType,
    Double discountValue,
    Double maxDiscountAmount,
    Double minOrderValue,
    LocalDateTime startDate,
    LocalDateTime endDate,
    Integer usageLimit,
    Integer usageLimitPerUser,
    Integer usedCount,
    Boolean isActive,
    LocalDateTime createdAt,
    Long targetUserId
) {}
