package com.laundry.dto.response;

import java.util.List;

public record ShopResponseDTO(
    Long id,
    String name,
    String address,
    Double latitude,
    Double longitude,
    Double distanceKm,
    String phone,
    String coverImage,
    List<String> galleryImages,
    String operatingHours,
    Integer totalWashers,
    Integer totalDryers,
    Boolean isActive,
    Double rating,
    Integer reviewCount,
    Double baseShippingFee,
    Double extraShippingFeePerKm,
    Double maxDeliveryDistance,
    List<ServiceDTO> services,
    String approvalStatus,
    String rejectionReason
) {
    public ShopResponseDTO(
        Long id, String name, String address, Double latitude, Double longitude, Double distanceKm,
        String phone, String coverImage, List<String> galleryImages, String operatingHours,
        Integer totalWashers, Integer totalDryers, Boolean isActive, Double rating, Integer reviewCount,
        Double baseShippingFee, Double extraShippingFeePerKm, Double maxDeliveryDistance, List<ServiceDTO> services
    ) {
        this(id, name, address, latitude, longitude, distanceKm, phone, coverImage, galleryImages,
             operatingHours, totalWashers, totalDryers, isActive, rating, reviewCount, baseShippingFee,
             extraShippingFeePerKm, maxDeliveryDistance, services, "APPROVED", null);
    }
}
