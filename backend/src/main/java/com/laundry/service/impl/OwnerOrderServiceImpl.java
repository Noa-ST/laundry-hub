package com.laundry.service.impl;

import com.laundry.dto.request.UpdateActualWeightRequestDTO;
import com.laundry.dto.request.UpdateOrderStatusRequestDTO;
import com.laundry.dto.response.OrderItemResponseDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.OwnerOrderSummaryDTO;
import com.laundry.entity.InboundMethod;
import com.laundry.entity.Order;
import com.laundry.entity.OrderItem;
import com.laundry.entity.OrderStatus;
import com.laundry.entity.OutboundMethod;
import com.laundry.repository.OrderRepository;
import com.laundry.service.OwnerOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OwnerOrderServiceImpl implements OwnerOrderService {

    private final OrderRepository orderRepository;

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponseDTO> getOwnerOrders(Long ownerId, OrderStatus status) {
        List<Order> orders;
        if (status == null) {
            orders = orderRepository.findByShopOwnerIdOrderByCreatedAtDesc(ownerId);
        } else {
            orders = orderRepository.findByShopOwnerIdAndStatusOrderByCreatedAtDesc(ownerId, status);
        }
        return orders.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OwnerOrderSummaryDTO getOrderSummary(Long ownerId) {
        List<Order> orders = orderRepository.findByShopOwnerIdOrderByCreatedAtDesc(ownerId);
        
        long pendingCount = 0;
        long processingCount = 0;
        long readyCount = 0;
        long completedCount = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;

        for (Order o : orders) {
            if (o.getStatus() == OrderStatus.PENDING) pendingCount++;
            if (o.getStatus() == OrderStatus.PROCESSING) processingCount++;
            if (o.getStatus() == OrderStatus.READY) readyCount++;
            if (o.getStatus() == OrderStatus.COMPLETED) {
                completedCount++;
                if (o.getFinalTotalPrice() != null) {
                    totalRevenue = totalRevenue.add(o.getFinalTotalPrice());
                }
            }
        }
        return new OwnerOrderSummaryDTO(pendingCount, processingCount, readyCount, completedCount, totalRevenue);
    }

    @Override
    @Transactional
    public OrderResponseDTO updateOrderStatus(Long ownerId, Long orderId, UpdateOrderStatusRequestDTO request) {
        Order order = getOrderAndValidateOwner(ownerId, orderId);
        OrderStatus current = order.getStatus();
        OrderStatus next = request.newStatus();

        if (next == OrderStatus.CANCELLED) {
            if (current == OrderStatus.COMPLETED) {
                throw new IllegalArgumentException("KhÃ´ng thá»ƒ há»§y Ä‘Æ¡n hÃ ng Ä‘Ã£ hoÃ n thÃ nh.");
            }
            order.setStatus(OrderStatus.CANCELLED);
            order.setCancelReason(request.cancelReason());
            return mapToDTO(orderRepository.save(order));
        }

        validateStateTransition(current, next, order.getInboundMethod(), order.getOutboundMethod());
        order.setStatus(next);
        
        if (next == OrderStatus.COMPLETED) {
            order.setIsPaid(true);
        }

        return mapToDTO(orderRepository.save(order));
    }

    private void validateStateTransition(OrderStatus current, OrderStatus next, InboundMethod inbound, OutboundMethod outbound) {
        boolean isValid = false;
        switch (current) {
            case PENDING:
                if (next == OrderStatus.CONFIRMED) isValid = true;
                break;
            case CONFIRMED:
                if (inbound == InboundMethod.STORE_PICKUP && next == OrderStatus.PICKING_UP) isValid = true;
                if (inbound == InboundMethod.DROP_OFF && next == OrderStatus.RECEIVED) isValid = true;
                break;
            case PICKING_UP:
                if (next == OrderStatus.RECEIVED) isValid = true;
                break;
            case RECEIVED:
                if (next == OrderStatus.PROCESSING) isValid = true;
                break;
            case PROCESSING:
                if (next == OrderStatus.READY) isValid = true;
                break;
            case READY:
                if (outbound == OutboundMethod.DELIVERY_TO_HOME && next == OrderStatus.DELIVERING) isValid = true;
                if (outbound == OutboundMethod.PICKUP_AT_STORE && next == OrderStatus.COMPLETED) isValid = true;
                break;
            case DELIVERING:
                if (next == OrderStatus.COMPLETED) isValid = true;
                break;
            default:
                break;
        }

        if (!isValid) {
            throw new IllegalArgumentException("Tráº¡ng thÃ¡i chuyá»ƒn Ä‘á»•i tá»« " + current + " sang " + next + " khÃ´ng há»£p lá»‡ vá»›i hÃ¬nh thá»©c giao nháº­n.");
        }
    }

    @Override
    @Transactional
    public OrderResponseDTO updateActualWeight(Long ownerId, Long orderId, UpdateActualWeightRequestDTO request) {
        Order order = getOrderAndValidateOwner(ownerId, orderId);
        if (order.getStatus() != OrderStatus.RECEIVED) {
            throw new IllegalArgumentException("Chá»‰ Ä‘Æ°á»£c cáº­p nháº­t cÃ¢n náº·ng/sá»‘ lÆ°á»£ng thá»±c táº¿ khi Ä‘Æ¡n á»Ÿ tráº¡ng thÃ¡i RECEIVED.");
        }

        order.setActualWeight(request.actualWeight());

        BigDecimal newServiceFee = BigDecimal.ZERO;
        for (OrderItem item : order.getItems()) {
            if (item.getService().getUnit() != null && "kg".equalsIgnoreCase(item.getService().getUnit().getName())) {
                item.setQuantity(request.actualWeight()); 
            }
            BigDecimal lineTotal = item.getPriceAtBooking().multiply(BigDecimal.valueOf(item.getQuantity()));
            newServiceFee = newServiceFee.add(lineTotal);
        }
        
        order.setServiceFee(newServiceFee);
        order.setFinalTotalPrice(newServiceFee.add(order.getShippingFee()));
        order.setActualTotalPrice(order.getFinalTotalPrice());
        
        order.setStatus(OrderStatus.PROCESSING); 

        return mapToDTO(orderRepository.save(order));
    }

    private Order getOrderAndValidateOwner(Long ownerId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("ÄÆ¡n hÃ ng khÃ´ng tá»“n táº¡i"));
        
        if (!order.getShop().getOwner().getId().equals(ownerId)) {
            throw new IllegalArgumentException("Báº¡n khÃ´ng cÃ³ quyá»n thao tÃ¡c trÃªn Ä‘Æ¡n hÃ ng nÃ y.");
        }
        return order;
    }

    private OrderResponseDTO mapToDTO(Order order) {
        List<OrderItemResponseDTO> items = order.getItems().stream()
                .map(item -> new OrderItemResponseDTO(
                        item.getId(),
                        item.getService().getName(),
                        item.getQuantity(),
                        item.getPriceAtBooking(),
                        item.getService().getUnit() != null ? item.getService().getUnit().getName() : ""
                ))
                .collect(Collectors.toList());

        return new OrderResponseDTO(
                order.getId(),
                order.getShop().getId(),
                order.getShop().getName(),
                order.getStatus().name(),
                order.getBookingTime(),
                order.getServiceFee(),
                order.getShippingFee(),
                order.getFinalTotalPrice(),
                order.getEstimatedTotalPrice(),
                order.getInboundMethod() != null ? order.getInboundMethod().name() : null,
                order.getOutboundMethod() != null ? order.getOutboundMethod().name() : null,
                order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null,
                order.getReceiverName(),
                order.getReceiverPhone(),
                order.getDeliveryAddress(),
                order.getNote(),
                order.getCreatedAt(),
                items
        );
    }
}
