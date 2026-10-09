package com.laundry.controller;

import com.laundry.dto.response.ApiResponse;
import com.laundry.entity.Voucher;
import com.laundry.exception.ResourceNotFoundException;
import com.laundry.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/vouchers")
@RequiredArgsConstructor
public class PublicVoucherController {

    private final VoucherRepository voucherRepository;

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateVoucher(
            @RequestParam Long shopId,
            @RequestParam String code,
            @RequestParam Double orderTotal) {
        
        Voucher voucher = voucherRepository.findByShopIdAndCode(shopId, code.toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại"));

        if (!voucher.isValidForOrder(orderTotal)) {
            throw new IllegalArgumentException("Mã giảm giá không hợp lệ hoặc không đủ điều kiện áp dụng");
        }

        Double discountAmount = voucher.calculateDiscount(orderTotal);

        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "voucherId", voucher.getId(),
                "code", voucher.getCode(),
                "discountAmount", discountAmount
        )));
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<java.util.List<com.laundry.dto.response.VoucherResponseDTO>>> getActiveVouchers(@PathVariable Long shopId) {
        java.util.List<Voucher> vouchers = voucherRepository.findActiveVouchersForShop(shopId);
        
        java.util.List<com.laundry.dto.response.VoucherResponseDTO> dtos = vouchers.stream().map(v -> new com.laundry.dto.response.VoucherResponseDTO(
                v.getId(),
                v.getCode(),
                v.getDiscountType().name(),
                v.getDiscountValue(),
                v.getMaxDiscountAmount(),
                v.getMinOrderValue(),
                v.getStartDate(),
                v.getEndDate(),
                v.getUsageLimit(),
                v.getUsageLimitPerUser(),
                v.getUsedCount(),
                v.getIsActive(),
                v.getCreatedAt()
        )).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(dtos));
    }
}
