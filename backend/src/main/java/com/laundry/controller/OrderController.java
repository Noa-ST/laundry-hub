package com.laundry.controller;

import com.laundry.common.dto.ApiResponse;
import com.laundry.dto.request.CreateOrderRequestDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponseDTO>> createOrder(
            @RequestHeader("X-Mock-User-Id") Long customerId,
            @Valid @RequestBody CreateOrderRequestDTO request) {
        
        OrderResponseDTO response = orderService.createOrder(customerId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Đặt lịch thành công"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<OrderResponseDTO>>> getMyOrders(
            @RequestHeader("X-Mock-User-Id") Long customerId) {
        List<OrderResponseDTO> response = orderService.getMyOrders(customerId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
