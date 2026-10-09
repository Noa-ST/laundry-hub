package com.laundry.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

public record UpdateOrderItemsRequestDTO(
    @NotEmpty List<ItemUpdate> items
) {
    public record ItemUpdate(
        @NotNull Long itemId,
        @NotNull @Positive Double quantity
    ) {}
}
