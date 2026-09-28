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
    BigDecimal finalTotalPrice,
    BigDecimal estimatedTotalPrice,
    
    String inboundMethod,
    String outboundMethod,
    String paymentMethod,
    
    String receiverName,
    String receiverPhone,
    String deliveryAddress,
    
    String note,
    LocalDateTime createdAt,
    List<OrderItemResponseDTO> items
) {}
