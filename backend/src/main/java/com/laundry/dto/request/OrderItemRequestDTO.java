package com.laundry.dto.request;
import jakarta.validation.constraints.*;

public record OrderItemRequestDTO(
    @NotNull Long serviceId,
    @NotNull @Min(0) Double quantity
) {}
