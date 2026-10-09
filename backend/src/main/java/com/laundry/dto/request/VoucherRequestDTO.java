package com.laundry.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record VoucherRequestDTO(
    @NotBlank(message = "Mã voucher không được để trống")
    String code,
    
    @NotBlank(message = "Loại giảm giá không được để trống")
    String discountType,
    
    @NotNull(message = "Giá trị giảm giá không được để trống")
    Double discountValue,
    
    Double maxDiscountAmount,
    Double minOrderValue,
    
    @NotNull(message = "Ngày bắt đầu không được để trống")
    LocalDateTime startDate,
    
    @NotNull(message = "Ngày kết thúc không được để trống")
    LocalDateTime endDate,
    
    Integer usageLimit,
    Integer usageLimitPerUser,
    Boolean isActive
) {}
