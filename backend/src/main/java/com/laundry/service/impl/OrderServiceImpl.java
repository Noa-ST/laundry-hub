package com.laundry.service.impl;

import com.laundry.dto.request.CreateOrderRequestDTO;
import com.laundry.dto.response.OrderItemResponseDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.entity.*;
import com.laundry.enums.*;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.OrderRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.UserRepository;
import com.laundry.repository.VoucherRepository;
import com.laundry.service.OrderService;
import com.laundry.service.NotificationService;
import com.laundry.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final LaundryServiceRepository laundryServiceRepository;
    private final NotificationService notificationService;
    private final VoucherRepository voucherRepository;

    @Override
    @Transactional
    public OrderResponseDTO createOrder(Long customerId, CreateOrderRequestDTO request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("ÄÆ¡n hÃ ng pháº£i cÃ³ Ã­t nháº¥t má»™t dá»‹ch vá»¥.");
        }
        
        double totalQty = request.items().stream().mapToDouble(i -> i.quantity()).sum();
        if (totalQty <= 0) {
            throw new IllegalArgumentException("ÄÆ¡n hÃ ng pháº£i cÃ³ Ã­t nháº¥t má»™t dá»‹ch vá»¥.");
        }

        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("KhÃ¡ch hÃ ng khÃ´ng tá»“n táº¡i"));
        
        Shop shop = shopRepository.findById(request.shopId())
                .orElseThrow(() -> new IllegalArgumentException("Tiá»‡m giáº·t khÃ´ng tá»“n táº¡i"));

        Order order = Order.builder()
                .customer(customer)
                .shop(shop)
                .bookingTime(request.bookingTime())
                .note(request.note())
                .status(OrderStatus.PENDING)
                .inboundType(request.inboundType())
                .outboundType(request.outboundType())
                .paymentMethod(request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.COD)
                .receiverName(request.receiverName())
                .receiverPhone(request.receiverPhone())
                .deliveryAddress(request.outboundType() == OutboundType.SHOP_DELIVERY || request.pickupAddress() == null
                        ? request.deliveryAddress() : null)
                .pickupAddress(request.inboundType() == InboundType.SHOP_PICK_UP ? request.pickupAddress() : null)
                .build();

        BigDecimal serviceFee = BigDecimal.ZERO;

        for (var itemReq : request.items()) {
            LaundryService service = laundryServiceRepository.findById(itemReq.serviceId())
                    .orElseThrow(() -> new IllegalArgumentException("Dá»‹ch vá»¥ khÃ´ng tá»“n táº¡i: " + itemReq.serviceId()));
            
            if (!service.getShop().getId().equals(shop.getId())) {
                throw new IllegalArgumentException("Dá»‹ch vá»¥ khÃ´ng thuá»™c vá» tiá»‡m nÃ y");
            }

            BigDecimal itemPrice = BigDecimal.valueOf(service.getPrice());
            BigDecimal quantity = BigDecimal.valueOf(itemReq.quantity());
            BigDecimal lineTotal = itemPrice.multiply(quantity);
            serviceFee = serviceFee.add(lineTotal);

            OrderItem orderItem = OrderItem.builder()
                    .service(service)
                    .quantity(itemReq.quantity())
                    .priceAtBooking(itemPrice)
                    .build();
            
            order.addItem(orderItem);
        }

        // Logic PhÃ­ Ship
        BigDecimal shippingFee = BigDecimal.ZERO;
        int shippingLegs = 0;
        if (request.inboundType() == InboundType.SHOP_PICK_UP) shippingLegs++;
        if (request.outboundType() == OutboundType.SHOP_DELIVERY) shippingLegs++;
        
        if (shippingLegs > 0) {
            if (request.userLat() == null || request.userLng() == null) {
                throw new IllegalArgumentException("KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c vá»‹ trÃ­ giao nháº­n.");
            }

            double maxDeliveryDist = shop.getMaxDeliveryDistance() != null ? shop.getMaxDeliveryDistance() : 10.0;

            // Chiều gửi đồ: Shop đến lấy tại địa chỉ nhận đồ (fallback về userLat/userLng cho client cũ)
            if (request.inboundType() == InboundType.SHOP_PICK_UP) {
                boolean hasPickupCoords = request.pickupLat() != null && request.pickupLng() != null;
                double pickupLat = hasPickupCoords ? request.pickupLat() : request.userLat();
                double pickupLng = hasPickupCoords ? request.pickupLng() : request.userLng();
                double pickupDistanceKm = GeoUtils.calculateDistance(
                        pickupLat, pickupLng,
                        shop.getLatitude(), shop.getLongitude()
                );
                if (pickupDistanceKm > maxDeliveryDist) {
                    throw new IllegalArgumentException("Địa chỉ nhận đồ nằm ngoài bán kính phục vụ " + maxDeliveryDist + "km của tiệm.");
                }
                shippingFee = shippingFee.add(calculateShippingFee(pickupDistanceKm, 1, shop));
            }

            // Chiều trả đồ: Shop giao về địa chỉ trả đồ (userLat/userLng)
            if (request.outboundType() == OutboundType.SHOP_DELIVERY) {
                double deliveryDistanceKm = GeoUtils.calculateDistance(
                        request.userLat(), request.userLng(),
                        shop.getLatitude(), shop.getLongitude()
                );
                if (deliveryDistanceKm > maxDeliveryDist) {
                    throw new IllegalArgumentException("Địa chỉ trả đồ nằm ngoài bán kính phục vụ " + maxDeliveryDist + "km của tiệm.");
                }
                shippingFee = shippingFee.add(calculateShippingFee(deliveryDistanceKm, 1, shop));
            }
        }

        BigDecimal preDiscountTotal = serviceFee.add(shippingFee);
        BigDecimal discountAmount = BigDecimal.ZERO;
        
        if (request.voucherCode() != null && !request.voucherCode().trim().isEmpty()) {
            Voucher voucher = voucherRepository.findByShopIdAndCode(shop.getId(), request.voucherCode().trim().toUpperCase())
                    .orElseThrow(() -> new IllegalArgumentException("Mã giảm giá không hợp lệ"));
            if (voucher.getTargetUser() != null && !voucher.getTargetUser().getId().equals(customer.getId())) {
                throw new IllegalArgumentException("Mã giảm giá này dành riêng cho khách hàng khác và không thể áp dụng cho tài khoản của bạn.");
            }
            if (!voucher.isValidForOrder(preDiscountTotal.doubleValue())) {
                throw new IllegalArgumentException("Mã giảm giá không đủ điều kiện áp dụng");
            }
            if (voucher.getUsageLimitPerUser() != null) {
                long userUsageCount = orderRepository.countByCustomerIdAndVoucherIdAndStatusNot(
                        customer.getId(), voucher.getId(), OrderStatus.CANCELLED);
                if (userUsageCount >= voucher.getUsageLimitPerUser()) {
                    throw new IllegalArgumentException("Bạn đã sử dụng mã giảm giá này tối đa số lần cho phép (" + voucher.getUsageLimitPerUser() + " lần).");
                }
            }
            Double discount = voucher.calculateDiscount(preDiscountTotal.doubleValue());
            discountAmount = BigDecimal.valueOf(discount);
            
            order.setVoucher(voucher);
            voucher.setUsedCount(voucher.getUsedCount() + 1);
            voucherRepository.save(voucher);
        }

        BigDecimal finalTotalPrice = preDiscountTotal.subtract(discountAmount);
        if (finalTotalPrice.compareTo(BigDecimal.ZERO) < 0) {
            finalTotalPrice = BigDecimal.ZERO;
        }

        order.setServiceFee(serviceFee);
        order.setShippingFee(shippingFee);
        order.setDiscountAmount(discountAmount);
        order.setFinalTotalPrice(finalTotalPrice);
        order.setEstimatedTotal(finalTotalPrice);
        
        order = orderRepository.save(order);
        
        notificationService.sendNewOrderToOwners(
            order.getShop().getOwner().getId(),
            "Đơn hàng mới", 
            "Khách hàng " + customer.getFullName() + " vừa đặt một đơn mới", 
            order.getId()
        );
        
        return mapToDTO(order);
    }

    private BigDecimal calculateShippingFee(double distanceKm, int shippingLegs, Shop shop) {
        if (shippingLegs == 0) return BigDecimal.ZERO;
        double baseFee = shop.getBaseShippingFee() != null ? shop.getBaseShippingFee() : 15000.0;
        double extraFeePerKm = shop.getExtraShippingFeePerKm() != null ? shop.getExtraShippingFeePerKm() : 5000.0;
        
        double singleLegFee = baseFee + Math.max(0, Math.ceil(distanceKm - 2.0)) * extraFeePerKm;
        return BigDecimal.valueOf(singleLegFee * shippingLegs);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderResponseDTO> getMyOrders(Long customerId, Pageable pageable) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable)
                .map(this::mapToDTO);
    }

    @Override
    @Transactional
    public OrderResponseDTO updatePaymentMethod(Long customerId, Long orderId, String method) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));
        
        if (!order.getCustomer().getId().equals(customerId)) {
            throw new IllegalArgumentException("Bạn không có quyền cập nhật đơn hàng này");
        }
        
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalArgumentException("Đơn hàng đã thanh toán, không thể đổi phương thức");
        }
        
        try {
            order.setPaymentMethod(PaymentMethod.valueOf(method.toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Phương thức thanh toán không hợp lệ");
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
