package com.laundry.controller;

import com.laundry.dto.request.SetupShopRequestDTO;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.ShopResponseDTO;
import com.laundry.security.SecurityUtils;
import com.laundry.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner")
@RequiredArgsConstructor
public class OwnerShopController {

    private final ShopService shopService;

    @GetMapping("/my-shop")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<ApiResponse<ShopResponseDTO>> getMyShop(@org.springframework.security.core.annotation.AuthenticationPrincipal com.laundry.security.CustomUserDetails userDetails) {
        Long currentUserId = userDetails.getId();
        String currentUserPhone = userDetails.getUsername();
        
        org.slf4j.LoggerFactory.getLogger(OwnerShopController.class)
            .info("Checking shop for user ID: {}, phone: {}", currentUserId, currentUserPhone);
            
        ShopResponseDTO shop = shopService.getMyShop(currentUserId);
        
        // Return 200 with data=null if no shop exists, as requested
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tiệm thành công", shop));
    }

    @PostMapping("/setup-shop")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<ApiResponse<ShopResponseDTO>> setupShop(@Valid @RequestBody SetupShopRequestDTO request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        ShopResponseDTO shop = shopService.setupShop(currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success("Khởi tạo tiệm thành công", shop));
    }

    @PutMapping("/my-shop")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<ApiResponse<ShopResponseDTO>> updateShop(@Valid @RequestBody com.laundry.dto.request.UpdateShopRequestDTO request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        ShopResponseDTO shop = shopService.updateShop(currentUserId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin tiệm thành công", shop));
    }
}