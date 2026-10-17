package com.laundry.service.impl;

import com.laundry.dto.response.OrderItemResponseDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.entity.Order;
import com.laundry.enums.OrderStatus;
import com.laundry.exception.BadRequestException;
import com.laundry.repository.OrderRepository;
import com.laundry.service.CustomerOrderService;
import com.laundry.service.OrderStateMachineService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerOrderServiceImpl implements CustomerOrderService {

    private final OrderRepository orderRepository;
    private final OrderStateMachineService orderStateMachineService;
    private final com.laundry.repository.VoucherRepository voucherRepository;

    @Override
    @Transactional
    public OrderResponseDTO cancelOrder(Long customerId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Đơn hàng không tồn tại."));
        
        if (order.getCustomer() == null || !order.getCustomer().getId().equals(customerId)) {
            throw new BadRequestException("Bạn không có quyền thao tác trên đơn hàng này.");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể hủy đơn khi đơn hàng đang chờ xác nhận (PENDING).");
        }

        orderStateMachineService.transitionTo(order, OrderStatus.CANCELLED, "Khách hàng tự hủy", "CUSTOMER");

        if (order.getVoucher() != null) {
            com.laundry.entity.Voucher voucher = order.getVoucher();
            if (voucher.getUsedCount() != null && voucher.getUsedCount() > 0) {
                voucher.setUsedCount(voucher.getUsedCount() - 1);
                voucherRepository.save(voucher);
            }
        }
        
        return mapToDTO(orderRepository.save(order));
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
                order.getDiscountAmount(),
                order.getFinalTotalPrice(),
                order.getEstimatedTotal(),
                order.getVoucher() != null ? order.getVoucher().getCode() : null,
                order.getInboundType() != null ? order.getInboundType().name() : null,
                order.getOutboundType() != null ? order.getOutboundType().name() : null,
                order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null,
                order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null,
                (order.getReceiverName() != null && !order.getReceiverName().isBlank()) ? order.getReceiverName() : (order.getCustomer() != null ? order.getCustomer().getFullName() : null),
                (order.getReceiverPhone() != null && !order.getReceiverPhone().isBlank()) ? order.getReceiverPhone() : (order.getCustomer() != null ? order.getCustomer().getPhone() : null),
                order.getDeliveryAddress(),
                order.getPickupAddress(),
                order.getNote(),
                order.getCancelReason(),
                order.getCancelledBy(),
                order.getPaidAt(),
                order.getCreatedAt(),
                order.getReview() != null,
                order.isHasDispute(),
                items
        );
    }
}
