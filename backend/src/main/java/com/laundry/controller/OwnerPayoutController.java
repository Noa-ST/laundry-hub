package com.laundry.controller;

import com.laundry.dto.request.UpdateShopBankRequest;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.OwnerPayoutSummaryDTO;
import com.laundry.dto.response.ShopPayoutResponseDTO;
import com.laundry.security.SecurityUtils;
import com.laundry.service.ShopPayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/owner/payouts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SHOP_OWNER')")
public class OwnerPayoutController {

    private final ShopPayoutService shopPayoutService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShopPayoutResponseDTO>>> getMyPayouts() {
        Long ownerId = SecurityUtils.getCurrentUserId();
        List<ShopPayoutResponseDTO> list = shopPayoutService.getOwnerPayouts(ownerId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<OwnerPayoutSummaryDTO>> getSummary() {
        Long ownerId = SecurityUtils.getCurrentUserId();
        OwnerPayoutSummaryDTO summary = shopPayoutService.getOwnerPayoutSummary(ownerId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/{id}/orders")
    public ResponseEntity<ApiResponse<List<OrderResponseDTO>>> getOrdersInPayout(@PathVariable Long id) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        List<OrderResponseDTO> orders = shopPayoutService.getOrdersInPayoutForOwner(ownerId, id);
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @PutMapping("/bank-info")
    public ResponseEntity<ApiResponse<Void>> updateBankInfo(@RequestBody UpdateShopBankRequest request) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        shopPayoutService.updateShopBankInfo(ownerId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin tài khoản ngân hàng thành công", null));
    }
}
