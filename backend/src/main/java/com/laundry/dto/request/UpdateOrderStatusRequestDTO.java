package com.laundry.dto.request;
import com.laundry.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateOrderStatusRequestDTO(
    @NotNull OrderStatus newStatus,
    String cancelReason
) {}
