package com.laundry.dto.request;
import com.laundry.enums.InboundType;
import com.laundry.enums.OutboundType;
import com.laundry.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public record CreateOrderRequestDTO(
    @NotNull Long shopId,
    @NotNull LocalDateTime bookingTime,
    String note,
    @NotEmpty @Valid List<OrderItemRequestDTO> items,
    
    @NotNull InboundType inboundType,
    @NotNull OutboundType outboundType,
    PaymentMethod paymentMethod,
    
    String receiverName,
    String receiverPhone,
    String deliveryAddress,
    
    Double userLat,
    Double userLng,
    String voucherCode,

    // Địa chỉ nhận đồ (Shop đến lấy tận nơi) - tách riêng với địa chỉ trả đồ
    String pickupAddress,
    Double pickupLat,
    Double pickupLng
) {}
