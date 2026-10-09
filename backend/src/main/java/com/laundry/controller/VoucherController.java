package com.laundry.controller;

import com.laundry.dto.request.VoucherRequestDTO;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.VoucherResponseDTO;
import com.laundry.security.SecurityUtils;
import com.laundry.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/owner/vouchers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SHOP_OWNER')")
public class VoucherController {

    private final VoucherService voucherService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<VoucherResponseDTO>>> getVouchers() {
        Long ownerId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(voucherService.getShopVouchers(ownerId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VoucherResponseDTO>> createVoucher(@Valid @RequestBody VoucherRequestDTO request) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(voucherService.createVoucher(ownerId, request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<VoucherResponseDTO>> updateVoucher(
            @PathVariable Long id, 
            @Valid @RequestBody VoucherRequestDTO request) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(voucherService.updateVoucher(ownerId, id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVoucher(@PathVariable Long id) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        voucherService.deleteVoucher(ownerId, id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
