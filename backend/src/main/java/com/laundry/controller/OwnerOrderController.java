package com.laundry.controller;

import com.laundry.dto.request.UpdateOrderStatusRequestDTO;
import com.laundry.dto.request.InspectOrderRequestDTO;
import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.OwnerOrderSummaryDTO;
import com.laundry.enums.OrderStatus;
import com.laundry.service.OwnerOrderService;
import com.laundry.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/v1/owner/orders")
@RequiredArgsConstructor
public class OwnerOrderController {

    private final OwnerOrderService ownerOrderService;
    private final com.laundry.repository.UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OrderResponseDTO>>> getOwnerOrders(
            @RequestParam(required = false) List<OrderStatus> statuses,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size);
        Page<OrderResponseDTO> orders = ownerOrderService.getOwnerOrders(ownerId, statuses, pageable);
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<OwnerOrderSummaryDTO>> getOrderSummary() {
        Long ownerId = SecurityUtils.getCurrentUserId();
        OwnerOrderSummaryDTO summary = ownerOrderService.getOrderSummary(ownerId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @PutMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateOrderStatusRequestDTO request) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        OrderResponseDTO updatedOrder = ownerOrderService.updateOrderStatus(ownerId, orderId, request);
        return ResponseEntity.ok(ApiResponse.success(updatedOrder));
    }

    @PutMapping("/{orderId}/inspect")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> inspectOrder(
            @PathVariable Long orderId,
            @Valid @RequestBody InspectOrderRequestDTO request) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        OrderResponseDTO updatedOrder = ownerOrderService.inspectOrder(ownerId, orderId, request);
        return ResponseEntity.ok(ApiResponse.success(updatedOrder));
    }

    @PostMapping("/pos")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> createPosOrder(
            @Valid @RequestBody com.laundry.dto.request.CreatePosOrderRequestDTO request) {
        Long ownerId = SecurityUtils.getCurrentUserId();
        OrderResponseDTO createdOrder = ownerOrderService.createPosOrder(ownerId, request);
        return ResponseEntity.ok(ApiResponse.success(createdOrder));
    }

    @GetMapping("/customer/search")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> searchCustomerByPhone(
            @RequestParam String phone) {
        
        return userRepository.findByPhone(phone)
                .map(user -> ResponseEntity.ok(ApiResponse.success(
                        java.util.Map.of("id", (Object)user.getId(), "fullName", (Object)user.getFullName())
                )))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.success(null)));
    }
}