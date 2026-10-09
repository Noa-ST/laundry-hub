package com.laundry.dto.request;
import com.laundry.enums.InboundType;
import com.laundry.enums.OutboundType;
import com.laundry.enums.PaymentMethod;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public record CreateOrderRequestDTO(
    @NotNull Long shopId,
    @NotNull LocalDateTime bookingTime,
    String note,
    @NotEmpty List<OrderItemRequestDTO> items,
    
    @NotNull InboundType inboundType,
    @NotNull OutboundType outboundType,
    
    String receiverName,
    String receiverPhone,
    String deliveryAddress,
    
    Double userLat,
    Double userLng,
    String voucherCode
) {}
