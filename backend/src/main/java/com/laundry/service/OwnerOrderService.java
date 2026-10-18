package com.laundry.service;

import com.laundry.dto.request.CreatePosOrderRequestDTO;
import com.laundry.dto.request.InspectOrderRequestDTO;
import com.laundry.dto.request.UpdateOrderStatusRequestDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.OwnerOrderSummaryDTO;
import com.laundry.enums.OrderStatus;

import com.laundry.dto.request.UpdateOrderItemsRequestDTO;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface OwnerOrderService {
    Page<OrderResponseDTO> getOwnerOrders(Long ownerId, List<OrderStatus> statuses, Pageable pageable);
    OwnerOrderSummaryDTO getOrderSummary(Long ownerId);
    OrderResponseDTO updateOrderStatus(Long ownerId, Long orderId, UpdateOrderStatusRequestDTO request);
    OrderResponseDTO inspectOrder(Long ownerId, Long orderId, InspectOrderRequestDTO request);
    OrderResponseDTO updateOrderItems(Long ownerId, Long orderId, UpdateOrderItemsRequestDTO request);
    OrderResponseDTO createPosOrder(Long ownerId, CreatePosOrderRequestDTO request);
}
