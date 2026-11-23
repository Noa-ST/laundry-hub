package com.laundry.controller;

import com.laundry.dto.response.ApiResponse;
import com.laundry.entity.Voucher;
import com.laundry.exception.ResourceNotFoundException;
import com.laundry.repository.VoucherRepository;
import com.laundry.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/vouchers")
@RequiredArgsConstructor
public class PublicVoucherController {

    private final VoucherRepository voucherRepository;

    private Long resolveAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getId();
        }
        return null;
    }

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateVoucher(
            @RequestParam Long shopId,
            @RequestParam String code,
            @RequestParam Double orderTotal) {
        
        Long authenticatedUserId = resolveAuthenticatedUserId();
        Voucher voucher = voucherRepository.findByShopIdAndCode(shopId, code.toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá không tồn tại"));

        if (voucher.getTargetUser() != null && (authenticatedUserId == null || !voucher.getTargetUser().getId().equals(authenticatedUserId))) {
            throw new IllegalArgumentException("Mã giảm giá này dành riêng cho khách hàng khác và không thể áp dụng cho bạn");
        }

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
    public ResponseEntity<ApiResponse<java.util.List<com.laundry.dto.response.VoucherResponseDTO>>> getActiveVouchers(
            @PathVariable Long shopId) {
        Long authenticatedUserId = resolveAuthenticatedUserId();
        java.util.List<Voucher> vouchers;
        if (authenticatedUserId != null) {
            vouchers = voucherRepository.findActiveVouchersForShopAndCustomer(shopId, authenticatedUserId);
        } else {
            vouchers = voucherRepository.findActiveVouchersForShop(shopId);
        }
        
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
                v.getCreatedAt(),
                v.getTargetUser() != null ? v.getTargetUser().getId() : null
        )).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(dtos));
    }
}
