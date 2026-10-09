package com.laundry.service;

import com.laundry.dto.request.CreateOrderRequestDTO;
import com.laundry.dto.response.OrderResponseDTO;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface OrderService {
    OrderResponseDTO createOrder(Long customerId, CreateOrderRequestDTO request);
    Page<OrderResponseDTO> getMyOrders(Long customerId, Pageable pageable);
    OrderResponseDTO updatePaymentMethod(Long customerId, Long orderId, String method);
}
