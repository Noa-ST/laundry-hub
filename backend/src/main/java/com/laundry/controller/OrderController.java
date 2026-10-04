package com.laundry.controller;

import com.laundry.dto.response.ApiResponse;
import com.laundry.dto.request.CreateOrderRequestDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.service.OrderService;
import com.laundry.security.SecurityUtils;
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
            @Valid @RequestBody CreateOrderRequestDTO request) {
        Long customerId = SecurityUtils.getCurrentUserId();
        OrderResponseDTO response = orderService.createOrder(customerId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đặt lịch thành công", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<OrderResponseDTO>>> getMyOrders() {
        Long customerId = SecurityUtils.getCurrentUserId();
        List<OrderResponseDTO> response = orderService.getMyOrders(customerId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}