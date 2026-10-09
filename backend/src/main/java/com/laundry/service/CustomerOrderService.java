package com.laundry.service;

import com.laundry.dto.response.OrderResponseDTO;

public interface CustomerOrderService {
    OrderResponseDTO cancelOrder(Long customerId, Long orderId);
}
