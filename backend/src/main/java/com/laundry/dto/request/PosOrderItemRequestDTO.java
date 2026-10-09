package com.laundry.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PosOrderItemRequestDTO(
    @NotNull(message = "Thiếu ID dịch vụ")
    Long serviceId,
    
    @NotNull(message = "Thiếu số lượng")
    @Positive(message = "Số lượng phải lớn hơn 0")
    Double quantity,
    
    @NotNull(message = "Thiếu đơn giá")
    @Positive(message = "Đơn giá phải lớn hơn 0")
    Double unitPrice
) {}
