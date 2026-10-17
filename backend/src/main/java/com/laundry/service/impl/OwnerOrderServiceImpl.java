package com.laundry.service.impl;

import com.laundry.dto.request.CreatePosOrderRequestDTO;
import com.laundry.dto.request.InspectOrderRequestDTO;
import com.laundry.dto.request.PosOrderItemRequestDTO;
import com.laundry.dto.request.UpdateOrderStatusRequestDTO;
import com.laundry.dto.response.OrderItemResponseDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.dto.response.OwnerOrderSummaryDTO;
import com.laundry.entity.LaundryService;
import com.laundry.entity.Order;
import com.laundry.entity.OrderItem;
import com.laundry.entity.PriceType;
import com.laundry.enums.InboundType;
import com.laundry.enums.OrderStatus;
import com.laundry.enums.OutboundType;
import com.laundry.enums.PaymentMethod;
import com.laundry.enums.PaymentStatus;
import com.laundry.entity.Shop;
import com.laundry.entity.User;
import com.laundry.exception.BadRequestException;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.OrderRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.UserRepository;
import com.laundry.repository.VoucherRepository;
import com.laundry.entity.Voucher;
import com.laundry.service.OwnerOrderService;
import com.laundry.service.OrderStateMachineService;
import com.laundry.service.NotificationService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
@RequiredArgsConstructor
public class OwnerOrderServiceImpl implements OwnerOrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final LaundryServiceRepository laundryServiceRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrderStateMachineService orderStateMachineService;
    private final NotificationService notificationService;
    private final VoucherRepository voucherRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<OrderResponseDTO> getOwnerOrders(Long ownerId, List<OrderStatus> statuses, Pageable pageable) {
        Page<Order> orders;
        if (statuses == null || statuses.isEmpty()) {
            orders = orderRepository.findByShopOwnerIdOrderByCreatedAtDesc(ownerId, pageable);
        } else {
            orders = orderRepository.findByShopOwnerIdAndStatusInOrderByCreatedAtDesc(ownerId, statuses, pageable);
        }
        return orders.map(this::mapToDTO);
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
    public OrderResponseDTO createPosOrder(Long ownerId, CreatePosOrderRequestDTO request) {
        Shop shop = shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tiệm của bạn."));

        User customer = userRepository.findByPhone(request.customerPhone()).orElse(null);

        PaymentMethod pm = request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.COD;
        boolean paid = request.isPaid() != null ? request.isPaid() : true;
        PaymentStatus ps = paid ? PaymentStatus.PAID : PaymentStatus.PENDING;
        Instant paidTime = paid ? Instant.now() : null;

        Order order = Order.builder()
                .customer(customer)
                .shop(shop)
                .status(OrderStatus.RECEIVED)
                .bookingTime(LocalDateTime.now())
                .inboundType(InboundType.CUSTOMER_DROP_OFF)
                .outboundType(OutboundType.CUSTOMER_PICK_UP)
                .paymentMethod(pm)
                .paymentStatus(ps)
                .paidAt(paidTime)
                .receiverName(request.customerName())
                .receiverPhone(request.customerPhone())
                .note(request.notes())
                .shippingFee(BigDecimal.ZERO)
                .build();

        BigDecimal serviceFee = BigDecimal.ZERO;

        for (PosOrderItemRequestDTO itemDto : request.items()) {
            LaundryService service = laundryServiceRepository.findById(itemDto.serviceId())
                    .orElseThrow(() -> new IllegalArgumentException("Dịch vụ không hợp lệ: " + itemDto.serviceId()));
                    
            BigDecimal unitPrice = BigDecimal.valueOf(itemDto.unitPrice());
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(itemDto.quantity()));
            
            if (service.getMinCharge() != null && service.getMinCharge() > 0) {
                BigDecimal minCharge = BigDecimal.valueOf(service.getMinCharge());
                if (itemTotal.compareTo(minCharge) < 0) {
                    itemTotal = minCharge;
                    unitPrice = minCharge.divide(BigDecimal.valueOf(itemDto.quantity()), 2, java.math.RoundingMode.HALF_UP);
                }
            }

            serviceFee = serviceFee.add(itemTotal);

            OrderItem orderItem = OrderItem.builder()
                    .service(service)
                    .quantity(itemDto.quantity())
                    .priceAtBooking(unitPrice)
                    .build();
                    
            order.addItem(orderItem);
        }

        BigDecimal discountAmount = BigDecimal.ZERO;
        
        if (request.voucherCode() != null && !request.voucherCode().trim().isEmpty()) {
            Voucher voucher = voucherRepository.findByShopIdAndCode(shop.getId(), request.voucherCode().trim().toUpperCase())
                    .orElseThrow(() -> new IllegalArgumentException("Mã giảm giá không hợp lệ"));
            if (!voucher.isValidForOrder(serviceFee.doubleValue())) {
                throw new IllegalArgumentException("Mã giảm giá không đủ điều kiện áp dụng");
            }
            Double discount = voucher.calculateDiscount(serviceFee.doubleValue());
            discountAmount = BigDecimal.valueOf(discount);
            
            order.setVoucher(voucher);
            voucher.setUsedCount(voucher.getUsedCount() + 1);
            voucherRepository.save(voucher);
        }

        BigDecimal finalTotalPrice = serviceFee.subtract(discountAmount);
        if (finalTotalPrice.compareTo(BigDecimal.ZERO) < 0) {
            finalTotalPrice = BigDecimal.ZERO;
        }

        order.setServiceFee(serviceFee);
        order.setDiscountAmount(discountAmount);
        order.setFinalTotalPrice(finalTotalPrice);
        order.setEstimatedTotal(finalTotalPrice);
        order.setActualTotalPrice(finalTotalPrice);

        Order savedOrder = orderRepository.save(order);
        return mapToDTO(savedOrder);
    }

    @Override
    @Transactional
    public OrderResponseDTO updateOrderStatus(Long ownerId, Long orderId, UpdateOrderStatusRequestDTO request) {
        Order order = getOrderAndValidateOwner(ownerId, orderId);
        orderStateMachineService.transitionTo(order, request.newStatus(), request.cancelReason(), "SHOP_OWNER");

        if (request.newStatus() == OrderStatus.CANCELLED && order.getVoucher() != null) {
            Voucher voucher = order.getVoucher();
            if (voucher.getUsedCount() != null && voucher.getUsedCount() > 0) {
                voucher.setUsedCount(voucher.getUsedCount() - 1);
                voucherRepository.save(voucher);
            }
        }

        Order savedOrder = orderRepository.save(order);
        
        // Gửi thông báo qua WebSockets cho Khách hàng (nội dung tiếng Việt tự nhiên, không lộ enum)
        if (savedOrder.getCustomer() != null) {
            OrderStatus newStatus = request.newStatus();
            notificationService.sendOrderNotification(
                savedOrder.getCustomer().getId(),
                newStatus.getNotificationTitle(),
                buildStatusMessage(savedOrder, newStatus, request.cancelReason()),
                savedOrder.getId()
            );
        }
        
        return mapToDTO(savedOrder);
    }

    /**
     * Sinh câu thông báo thân thiện cho khách theo trạng thái mới.
     */
    private String buildStatusMessage(Order order, OrderStatus status, String cancelReason) {
        String orderCode = "#" + String.format("ORD-%04d", order.getId());
        boolean isShopDelivery = order.getOutboundType() == OutboundType.SHOP_DELIVERY;

        return switch (status) {
            case READY -> isShopDelivery
                    ? "Đơn hàng " + orderCode + " đã giặt xong và sẽ sớm được giao đến bạn."
                    : "Đơn hàng " + orderCode + " đã giặt xong. Mời bạn ghé tiệm nhận đồ.";
            case CANCELLED -> (cancelReason != null && !cancelReason.isBlank())
                    ? status.formatNotificationMessage(orderCode) + " Lý do: " + cancelReason.trim()
                    : status.formatNotificationMessage(orderCode);
            default -> status.formatNotificationMessage(orderCode);
        };
    }

    @Override
    @Transactional
    public OrderResponseDTO inspectOrder(Long ownerId, Long orderId, InspectOrderRequestDTO request) {
        Order order = getOrderAndValidateOwner(ownerId, orderId);
        
        if (order.getStatus() != OrderStatus.RECEIVED) {
            throw new BadRequestException("Chỉ được cập nhật cân nặng/số lượng thực tế (inspect) khi đơn ở trạng thái RECEIVED.");
        }

        order.setActualWeight(request.actualWeight());
        if (request.notes() != null && !request.notes().trim().isEmpty()) {
            order.setNote((order.getNote() != null ? order.getNote() + " | " : "") + request.notes());
        }

        for (var itemUpdate : request.items()) {
            for (OrderItem item : order.getItems()) {
                if (item.getId().equals(itemUpdate.orderItemId())) {
                    if (itemUpdate.actualQuantity() != null && itemUpdate.actualQuantity() >= 0) {
                        item.setQuantity(itemUpdate.actualQuantity());
                    }
                    if (itemUpdate.unitPrice() != null && itemUpdate.unitPrice() > 0) {
                        // Với dịch vụ định giá sau (CONTACT), cập nhật đơn giá theo báo giá thực tế
                        // Với dịch vụ FIXED, bảo vệ quyền lợi khách: giữ nguyên giá niêm yết của dịch vụ
                        if (item.getService().getPriceType() == PriceType.CONTACT || item.getPriceAtBooking() == null || item.getPriceAtBooking().compareTo(BigDecimal.ZERO) == 0) {
                            item.setPriceAtBooking(BigDecimal.valueOf(itemUpdate.unitPrice()));
                        }
                    }
                    break;
                }
            }
        }

        BigDecimal newServiceFee = BigDecimal.ZERO;
        for (OrderItem item : order.getItems()) {
            BigDecimal lineTotal = item.getPriceAtBooking().multiply(BigDecimal.valueOf(item.getQuantity()));
            
            if (item.getService().getMinCharge() != null && item.getService().getMinCharge() > 0) {
                BigDecimal minCharge = BigDecimal.valueOf(item.getService().getMinCharge());
                if (lineTotal.compareTo(minCharge) < 0) {
                    lineTotal = minCharge;
                }
            }
            
            newServiceFee = newServiceFee.add(lineTotal);
        }
        
        BigDecimal discountAmount = order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO;
        if (order.getVoucher() != null) {
            // Recalculate discount based on new service fee + shipping fee (preDiscountTotal)
            BigDecimal preDiscountTotal = newServiceFee.add(order.getShippingFee() != null ? order.getShippingFee() : BigDecimal.ZERO);
            Double discount = order.getVoucher().calculateDiscount(preDiscountTotal.doubleValue());
            discountAmount = BigDecimal.valueOf(discount);
            order.setDiscountAmount(discountAmount);
        }
        
        BigDecimal preDiscountTotal = newServiceFee.add(order.getShippingFee() != null ? order.getShippingFee() : BigDecimal.ZERO);
        BigDecimal finalTotal = preDiscountTotal.subtract(discountAmount);
        if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
            finalTotal = BigDecimal.ZERO;
        }
        
        order.setServiceFee(newServiceFee);
        order.setFinalTotalPrice(finalTotal);
        order.setActualTotalPrice(order.getFinalTotalPrice());
        
        return mapToDTO(orderRepository.save(order));
    }

    private Order getOrderAndValidateOwner(Long ownerId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Đơn hàng không tồn tại"));
        
        if (!order.getShop().getOwner().getId().equals(ownerId)) {
            throw new IllegalArgumentException("Bạn không có quyền thao tác trên đơn hàng này.");
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
