package com.laundry.service;

import com.laundry.dto.request.SetupShopRequestDTO;
import com.laundry.dto.response.ShopResponseDTO;

import java.util.List;

public interface ShopService {
    List<ShopResponseDTO> findNearbyShops(Double lat, Double lng, Double radius);
    ShopResponseDTO getMyShop(Long ownerId);
    ShopResponseDTO setupShop(Long ownerId, SetupShopRequestDTO request);
    ShopResponseDTO updateShop(Long ownerId, com.laundry.dto.request.UpdateShopRequestDTO request);
    ShopResponseDTO resubmitShop(Long ownerId);
}