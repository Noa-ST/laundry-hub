package com.laundry.controller;

import com.laundry.common.dto.ApiResponse;
import com.laundry.dto.response.ShopResponseDTO;
import com.laundry.service.ShopService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shops")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<ShopResponseDTO>>> getNearbyShops(
            @RequestParam Double lat,
            @RequestParam Double lng,
            @RequestParam(defaultValue = "10.0") Double radius) {
        
        List<ShopResponseDTO> shops = shopService.findNearbyShops(lat, lng, radius);
        return ResponseEntity.ok(ApiResponse.success(shops));
    }
}
