package com.laundry.dto.response;

import java.util.List;

public record ShopResponseDTO(
    Long id,
    String name,
    String address,
    Double latitude,
    Double longitude,
    Double distanceKm,
    List<ServiceDTO> services
) {}
