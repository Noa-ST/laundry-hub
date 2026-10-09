package com.laundry.controller;

import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.service.CustomerOrderService;
import com.laundry.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class CustomerOrderController {

    private final CustomerOrderService customerOrderService;

    @PutMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> cancelOrder(@PathVariable Long orderId) {
        Long customerId = SecurityUtils.getCurrentUserId();
        OrderResponseDTO cancelledOrder = customerOrderService.cancelOrder(customerId, orderId);
        return ResponseEntity.ok(ApiResponse.success(cancelledOrder));
    }
}
