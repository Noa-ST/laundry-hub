package com.laundry.dto.request;
import com.laundry.entity.InboundMethod;
import com.laundry.entity.OutboundMethod;
import com.laundry.entity.PaymentMethod;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public record CreateOrderRequestDTO(
    @NotNull Long shopId,
    @NotNull LocalDateTime bookingTime,
    String note,
    @NotEmpty List<OrderItemRequestDTO> items,
    
    @NotNull InboundMethod inboundMethod,
    @NotNull OutboundMethod outboundMethod,
    @NotNull PaymentMethod paymentMethod,
    
    String receiverName,
    String receiverPhone,
    String deliveryAddress,
    
    Double userLat,
    Double userLng
) {}
