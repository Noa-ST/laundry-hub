package com.laundry.service;

import com.laundry.dto.request.UpdateActualWeightRequestDTO;
import com.laundry.dto.request.UpdateOrderStatusRequestDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.OwnerOrderSummaryDTO;
import com.laundry.entity.OrderStatus;

import java.util.List;

public interface OwnerOrderService {
    List<OrderResponseDTO> getOwnerOrders(Long ownerId, OrderStatus status);
    OwnerOrderSummaryDTO getOrderSummary(Long ownerId);
    OrderResponseDTO updateOrderStatus(Long ownerId, Long orderId, UpdateOrderStatusRequestDTO request);
    OrderResponseDTO updateActualWeight(Long ownerId, Long orderId, UpdateActualWeightRequestDTO request);
}
