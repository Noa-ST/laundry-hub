package com.laundry.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record UpdateOrderItemsRequestDTO(
    @NotEmpty List<ItemQuantityDTO> items
) {
    public record ItemQuantityDTO(
        Long itemId,
        Double quantity
    ) {}
}
