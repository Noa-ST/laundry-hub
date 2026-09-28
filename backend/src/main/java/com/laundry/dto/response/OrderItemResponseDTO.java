package com.laundry.dto.response;
import java.math.BigDecimal;

public record OrderItemResponseDTO(
    Long id,
    String serviceName,
    Double quantity,
    BigDecimal priceAtBooking,
    String unit
) {}
