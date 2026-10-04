package com.laundry.dto.request;

import com.laundry.entity.PriceType;

public record UpdateLaundryServiceRequestDTO(
        String name,
        Long categoryId,
        Long unitId,
        PriceType priceType,
        Double price,
        Double minCharge,
        String description,
        Boolean isActive
) {}
