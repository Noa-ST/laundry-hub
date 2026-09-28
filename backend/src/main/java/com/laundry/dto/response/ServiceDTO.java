package com.laundry.dto.response;

public record ServiceDTO(
    Long id,
    String name,
    String unit,
    Double price
) {}
