package com.laundry.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record InspectOrderRequestDTO(
    Double actualWeight,
    @NotEmpty List<InspectItemDTO> items,
    String notes
) {
    public record InspectItemDTO(
        Long orderItemId,
        Double actualQuantity,
        Double unitPrice
    ) {}
}
