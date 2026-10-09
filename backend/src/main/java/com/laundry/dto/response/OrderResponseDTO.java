package com.laundry.dto.response;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponseDTO(
    Long id,
    Long shopId,
    String shopName,
    String status,
    LocalDateTime bookingTime,
    
    BigDecimal serviceFee,
    BigDecimal shippingFee,
    BigDecimal discountAmount,
    BigDecimal finalTotalPrice,
    BigDecimal estimatedTotal,
    String voucherCode,
    
    String inboundType,
    String outboundType,
    String paymentMethod,
    String paymentStatus,
    
    String receiverName,
    String receiverPhone,
    String deliveryAddress,
    
    String note,
    String cancelReason,
    String cancelledBy,
    java.time.Instant paidAt,
    LocalDateTime createdAt,
    boolean isReviewed,
    List<OrderItemResponseDTO> items
) {}
