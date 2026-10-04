package com.laundry.service.impl;

import com.laundry.dto.request.CreateOrderRequestDTO;
import com.laundry.dto.response.OrderItemResponseDTO;
import com.laundry.dto.response.OrderResponseDTO;
import com.laundry.entity.*;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.OrderRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.UserRepository;
import com.laundry.service.OrderService;
import com.laundry.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final double MAX_SHIPPING_RADIUS_KM = 10.0;

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final LaundryServiceRepository laundryServiceRepository;

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
                .inboundMethod(request.inboundMethod())
                .outboundMethod(request.outboundMethod())
                .paymentMethod(request.paymentMethod())
                .receiverName(request.receiverName())
                .receiverPhone(request.receiverPhone())
                .deliveryAddress(request.deliveryAddress())
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
        if (request.inboundMethod() == InboundMethod.STORE_PICKUP) shippingLegs++;
        if (request.outboundMethod() == OutboundMethod.DELIVERY_TO_HOME) shippingLegs++;
        
        if (shippingLegs > 0) {
            if (request.userLat() == null || request.userLng() == null) {
                throw new IllegalArgumentException("KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c vá»‹ trÃ­ giao nháº­n.");
            }

            double distanceKm = GeoUtils.calculateDistance(
                    request.userLat(), request.userLng(),
                    shop.getLatitude(), shop.getLongitude()
            );

            if (distanceKm > MAX_SHIPPING_RADIUS_KM) {
                throw new IllegalArgumentException("Tiá»‡m chá»‰ nháº­n giao nháº­n táº­n nÆ¡i trong bÃ¡n kÃ­nh 10km.");
            }

            shippingFee = calculateShippingFee(distanceKm, shippingLegs);
        }

        BigDecimal finalTotalPrice = serviceFee.add(shippingFee);

        order.setServiceFee(serviceFee);
        order.setShippingFee(shippingFee);
        order.setFinalTotalPrice(finalTotalPrice);
        order.setEstimatedTotalPrice(finalTotalPrice);
        
        order = orderRepository.save(order);
        return mapToDTO(order);
    }

    private BigDecimal calculateShippingFee(double distanceKm, int shippingLegs) {
        if (shippingLegs == 0) return BigDecimal.ZERO;
        double singleLegFee = 15000.0 + Math.max(0, Math.ceil(distanceKm - 2.0)) * 5000.0;
        return BigDecimal.valueOf(singleLegFee * shippingLegs);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponseDTO> getMyOrders(Long customerId) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
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
