package com.laundry.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UpdateShopRequestDTO(
    @NotBlank(message = "Tên tiệm không được để trống") 
    String name,
    
    @NotBlank(message = "Địa chỉ không được để trống") 
    String address,
    
    @NotNull(message = "Vĩ độ không được để trống") 
    Double latitude,
    
    @NotNull(message = "Kinh độ không được để trống") 
    Double longitude,
    
    @NotBlank(message = "Số điện thoại tiệm không được để trống") 
    String phone,
    
    @NotBlank(message = "Ảnh bìa tiệm (Cover Image) không được để trống")
    String coverImage,
    
    List<String> galleryImages,
    
    String operatingHours,
    
    @Min(value = 1, message = "Cần tối thiểu 1 máy giặt") 
    int totalWashers,
    
    @Min(value = 0, message = "Số máy sấy không hợp lệ") 
    int totalDryers,
    
    Double baseShippingFee,
    Double extraShippingFeePerKm,
    Double maxDeliveryDistance,

    Boolean isActive
) {}
