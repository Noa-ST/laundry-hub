package com.laundry.dto.response;

import com.laundry.entity.PriceType;

public record LaundryServiceResponseDTO(
        Long id,
        String name,
        CategoryResponseDTO category,
        UnitResponseDTO unit,
        PriceType priceType,
        Double price,
        Double minCharge,
        String description,
        boolean isActive
) {}
