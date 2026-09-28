package com.laundry.service;

import com.laundry.dto.request.CreateOrderRequestDTO;
import com.laundry.dto.response.OrderResponseDTO;

import java.util.List;

public interface OrderService {
    OrderResponseDTO createOrder(Long customerId, CreateOrderRequestDTO request);
    List<OrderResponseDTO> getMyOrders(Long customerId);
}
