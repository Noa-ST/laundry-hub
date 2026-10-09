package com.laundry.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreatePosOrderRequestDTO(
    @NotBlank(message = "Số điện thoại khách hàng không được để trống")
    String customerPhone,
    
    @NotBlank(message = "Tên khách hàng không được để trống")
    String customerName,
    
    @NotEmpty(message = "Đơn hàng phải có ít nhất 1 dịch vụ")
    @Valid
    List<PosOrderItemRequestDTO> items,
    
    String notes,
    
    String voucherCode
) {}
