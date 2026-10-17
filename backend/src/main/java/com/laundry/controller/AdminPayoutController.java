package com.laundry.controller;

import com.laundry.dto.request.ConfirmPayoutRequest;
import com.laundry.dto.request.CreatePayoutBatchRequest;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.PayoutStatsResponseDTO;
import com.laundry.dto.response.ShopPayoutResponseDTO;
import com.laundry.enums.PayoutStatus;
import com.laundry.service.ShopPayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/payouts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPayoutController {

    private final ShopPayoutService shopPayoutService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<PayoutStatsResponseDTO>> getStats() {
        PayoutStatsResponseDTO stats = shopPayoutService.getAdminPayoutStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShopPayoutResponseDTO>>> getPayouts(
            @RequestParam(required = false) PayoutStatus status,
            @RequestParam(required = false) Long shopId) {
        List<ShopPayoutResponseDTO> payouts = shopPayoutService.getAdminPayouts(status, shopId);
        return ResponseEntity.ok(ApiResponse.success(payouts));
    }

    @PostMapping("/create-batch")
    public ResponseEntity<ApiResponse<List<ShopPayoutResponseDTO>>> createBatch(
            @RequestBody(required = false) CreatePayoutBatchRequest request) {
        List<ShopPayoutResponseDTO> result = shopPayoutService.createPayoutBatch(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo đợt đối soát giải ngân thành công", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopPayoutResponseDTO>> getPayoutDetail(@PathVariable Long id) {
        ShopPayoutResponseDTO detail = shopPayoutService.getPayoutDetail(id);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    @GetMapping("/{id}/orders")
    public ResponseEntity<ApiResponse<List<OrderResponseDTO>>> getOrdersInPayout(@PathVariable Long id) {
        List<OrderResponseDTO> orders = shopPayoutService.getOrdersInPayout(id);
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<ShopPayoutResponseDTO>> confirmPayout(
            @PathVariable Long id,
            @RequestBody(required = false) ConfirmPayoutRequest request) {
        ShopPayoutResponseDTO result = shopPayoutService.confirmPayout(id, request);
        return ResponseEntity.ok(ApiResponse.success("Xác nhận giải ngân thành công", result));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<ShopPayoutResponseDTO>> rejectPayout(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        ShopPayoutResponseDTO result = shopPayoutService.rejectPayout(id, reason);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy đợt giải ngân và nhả đơn về chờ đối soát", result));
    }
}
