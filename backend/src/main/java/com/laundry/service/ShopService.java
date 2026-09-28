package com.laundry.service;

import com.laundry.dto.response.ShopResponseDTO;

import java.util.List;

public interface ShopService {
    List<ShopResponseDTO> findNearbyShops(Double lat, Double lng, Double radius);
}
