package com.laundry.dto.response;

public record CategoryResponseDTO(
        Long id,
        String name,
        Integer displayOrder
) {}
