package com.laundry.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;


public record SetupShopRequestDTO(
    @NotBlank(message = "TÃªn tiá»‡m khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng") 
    String name,
    
    @NotBlank(message = "Äá»‹a chá»‰ khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng") 
    String address,
    
    @NotNull(message = "VÄ© Ä‘á»™ khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng") 
    Double latitude,
    
    @NotNull(message = "Kinh Ä‘á»™ khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng") 
    Double longitude,
    
    @NotBlank(message = "Số điện thoại tiệm không được để trống") 
    String phone,
    
    @NotBlank(message = "Ảnh bìa tiệm (Cover Image) không được để trống")
    String coverImage,
    
    List<String> galleryImages,
    
    String operatingHours,
    
    @Min(value = 1, message = "Cần tối thiểu 1 máy giặt") 
    int totalWashers,
    
    @Min(value = 0, message = "Sá»‘ mÃ¡y sáº¥y khÃ´ng há»£p lá»‡") 
    int totalDryers,
    
    Double baseShippingFee,
    Double extraShippingFeePerKm,
    Double maxDeliveryDistance,

    List<ServiceSetupDTO> services
) {
    public record ServiceSetupDTO(
        @NotBlank String name,
        @NotNull String unit,
        @NotNull Double price
    ) {}
}