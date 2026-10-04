package com.laundry.controller;

import com.laundry.dto.request.UpdateActualWeightRequestDTO;
import com.laundry.dto.request.UpdateOrderStatusRequestDTO;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.OwnerOrderSummaryDTO;
import com.laundry.entity.OrderStatus;
import com.laundry.service.OwnerOrderService;
import com.laundry.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/owner/orders")
@RequiredArgsConstructor
public class OwnerOrderController {

    private final OwnerOrderService ownerOrderService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponseDTO>>> getOwnerOrders(
            @RequestParam(required = false) OrderStatus status) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        List<OrderResponseDTO> orders = ownerOrderService.getOwnerOrders(ownerId, status);
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<OwnerOrderSummaryDTO>> getOrderSummary() {
        Long ownerId = SecurityUtils.getCurrentUserId();
        OwnerOrderSummaryDTO summary = ownerOrderService.getOrderSummary(ownerId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @PatchMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateOrderStatusRequestDTO request) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        OrderResponseDTO updatedOrder = ownerOrderService.updateOrderStatus(ownerId, orderId, request);
        return ResponseEntity.ok(ApiResponse.success(updatedOrder));
    }

    @PatchMapping("/{orderId}/actual-weight")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> updateActualWeight(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateActualWeightRequestDTO request) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        OrderResponseDTO updatedOrder = ownerOrderService.updateActualWeight(ownerId, orderId, request);
        return ResponseEntity.ok(ApiResponse.success(updatedOrder));
    }
}