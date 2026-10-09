package com.laundry.service.impl;

import com.laundry.dto.request.SetupShopRequestDTO;
import com.laundry.dto.response.ServiceDTO;
import com.laundry.dto.response.ShopResponseDTO;
import com.laundry.entity.LaundryService;
import com.laundry.entity.PriceType;
import com.laundry.entity.ServiceCategory;
import com.laundry.entity.ServiceUnit;
import com.laundry.entity.Shop;
import com.laundry.entity.User;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.ServiceCategoryRepository;
import com.laundry.repository.ServiceUnitRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.UserRepository;
import com.laundry.service.ShopService;
import com.laundry.service.CloudinaryService;
import com.laundry.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShopServiceImpl implements ShopService {

    private final ShopRepository shopRepository;
    private final LaundryServiceRepository laundryServiceRepository;
    private final UserRepository userRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceUnitRepository serviceUnitRepository;
    private final CloudinaryService cloudinaryService;

    @Override
    public List<ShopResponseDTO> findNearbyShops(Double lat, Double lng, Double radius) {
        List<Shop> allShops = shopRepository.findByIsActiveTrue();
        
        record ShopWithDistance(Shop shop, Double distance) {}
        
        List<ShopWithDistance> nearbyShops = allShops.stream()
                .map(shop -> {
                    double distance = GeoUtils.calculateDistance(lat, lng, shop.getLatitude(), shop.getLongitude());
                    return new ShopWithDistance(shop, distance);
                })
                .filter(swd -> swd.distance() <= radius)
                .sorted((a, b) -> a.distance().compareTo(b.distance()))
                .limit(20)
                .collect(Collectors.toList());

        List<Long> shopIds = nearbyShops.stream()
                .map(swd -> swd.shop().getId())
                .collect(Collectors.toList());

        if (shopIds.isEmpty()) {
            return List.of();
        }

        List<LaundryService> services = laundryServiceRepository.findByShopIdIn(shopIds);
        Map<Long, List<ServiceDTO>> servicesByShop = services.stream()
                .collect(Collectors.groupingBy(
                        ls -> ls.getShop().getId(),
                        Collectors.mapping(ls -> new ServiceDTO(ls.getId(), ls.getName(), ls.getUnit() != null ? ls.getUnit().getName() : "", ls.getPrice()), Collectors.toList())
                ));

        return nearbyShops.stream()
                .map(swd -> {
                    double roundedDistance = Math.round(swd.distance() * 10.0) / 10.0;
                    return new ShopResponseDTO(
                            swd.shop().getId(),
                            swd.shop().getName(),
                            swd.shop().getAddress(),
                            swd.shop().getLatitude(),
                            swd.shop().getLongitude(),
                            roundedDistance,
                            swd.shop().getPhone(),
                            swd.shop().getCoverImage(),
                            swd.shop().getGalleryImages(),
                            swd.shop().getOperatingHours(),
                            swd.shop().getTotalWashers(),
                            swd.shop().getTotalDryers(),
                            swd.shop().getIsActive(),
                            swd.shop().getRating(),
                            swd.shop().getReviewCount(),
                            swd.shop().getBaseShippingFee(),
                            swd.shop().getExtraShippingFeePerKm(),
                            swd.shop().getMaxDeliveryDistance(),
                            servicesByShop.getOrDefault(swd.shop().getId(), List.of())
                    );
                })
                .collect(Collectors.toList());
    }

    @Override
    public ShopResponseDTO getMyShop(Long ownerId) {
        return shopRepository.findFirstByOwnerId(ownerId)
                .map(shop -> {
                    List<LaundryService> services = laundryServiceRepository.findByShopId(shop.getId());
                    List<ServiceDTO> serviceDTOs = services.stream()
                            .map(ls -> new ServiceDTO(ls.getId(), ls.getName(), ls.getUnit() != null ? ls.getUnit().getName() : "", ls.getPrice()))
                            .collect(Collectors.toList());
                    return new ShopResponseDTO(
                            shop.getId(),
                            shop.getName(),
                            shop.getAddress(),
                            shop.getLatitude(),
                            shop.getLongitude(),
                            0.0, // distanceKm
                            shop.getPhone(),
                            shop.getCoverImage(),
                            shop.getGalleryImages(),
                            shop.getOperatingHours(),
                            shop.getTotalWashers(),
                            shop.getTotalDryers(),
                            shop.getIsActive(),
                            shop.getRating(),
                            shop.getReviewCount(),
                            shop.getBaseShippingFee(),
                            shop.getExtraShippingFeePerKm(),
                            shop.getMaxDeliveryDistance(),
                            serviceDTOs
                    );
                })
                .orElse(null);
    }

    @Override
    @Transactional
    public ShopResponseDTO setupShop(Long ownerId, SetupShopRequestDTO request) {
        if (shopRepository.existsByOwnerId(ownerId)) {
            throw new IllegalArgumentException("Báº¡n Ä‘Ã£ sá»Ÿ há»¯u má»™t tiá»‡m giáº·t.");
        }

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("KhÃ´ng tÃ¬m tháº¥y chá»§ tiá»‡m."));

        Shop newShop = Shop.builder()
                .owner(owner)
                .name(request.name())
                .address(request.address())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .phone(request.phone())
                .coverImage(request.coverImage())
                .galleryImages(request.galleryImages() != null ? request.galleryImages() : new java.util.ArrayList<>())
                .operatingHours(request.operatingHours())
                .totalWashers(request.totalWashers())
                .totalDryers(request.totalDryers())
                .baseShippingFee(request.baseShippingFee() != null ? request.baseShippingFee() : 15000.0)
                .extraShippingFeePerKm(request.extraShippingFeePerKm() != null ? request.extraShippingFeePerKm() : 5000.0)
                .maxDeliveryDistance(request.maxDeliveryDistance() != null ? request.maxDeliveryDistance() : 10.0)
                .isActive(true)
                .build();

        Shop savedShop = shopRepository.save(newShop);

        // Khởi tạo mặc định
        ServiceCategory basicCategory = ServiceCategory.builder().name("Giặt sấy cơ bản").displayOrder(1).shop(savedShop).build();
        ServiceCategory premiumCategory = ServiceCategory.builder().name("Dịch vụ cao cấp").displayOrder(2).shop(savedShop).build();
        serviceCategoryRepository.saveAll(List.of(basicCategory, premiumCategory));

        ServiceUnit kgUnit = ServiceUnit.builder().name("Kg").isDefault(true).shop(savedShop).build();
        ServiceUnit pieceUnit = ServiceUnit.builder().name("Cái").isDefault(false).shop(savedShop).build();
        ServiceUnit setUnit = ServiceUnit.builder().name("Bộ").isDefault(false).shop(savedShop).build();
        ServiceUnit pairUnit = ServiceUnit.builder().name("Đôi").isDefault(false).shop(savedShop).build();
        serviceUnitRepository.saveAll(List.of(kgUnit, pieceUnit, setUnit, pairUnit));

        List<ServiceDTO> serviceDTOs = List.of();
        if (request.services() != null && !request.services().isEmpty()) {
            List<LaundryService> newServices = request.services().stream()
                    .map(s -> {
                        ServiceUnit unit = kgUnit;
                        if ("Cái".equalsIgnoreCase(s.unit())) unit = pieceUnit;
                        else if ("Bộ".equalsIgnoreCase(s.unit())) unit = setUnit;
                        else if ("Đôi".equalsIgnoreCase(s.unit())) unit = pairUnit;

                        return LaundryService.builder()
                            .shop(savedShop)
                            .name(s.name())
                            .category(basicCategory)
                            .unit(unit)
                            .priceType(PriceType.FIXED)
                            .price(s.price())
                            .build();
                    })
                    .collect(Collectors.toList());
                    
            List<LaundryService> savedServices = laundryServiceRepository.saveAll(newServices);
            serviceDTOs = savedServices.stream()
                    .map(ls -> new ServiceDTO(ls.getId(), ls.getName(), ls.getUnit() != null ? ls.getUnit().getName() : "", ls.getPrice()))
                    .collect(Collectors.toList());
        }

        return new ShopResponseDTO(
                savedShop.getId(),
                savedShop.getName(),
                savedShop.getAddress(),
                savedShop.getLatitude(),
                savedShop.getLongitude(),
                0.0,
                savedShop.getPhone(),
                savedShop.getCoverImage(),
                savedShop.getGalleryImages(),
                savedShop.getOperatingHours(),
                savedShop.getTotalWashers(),
                savedShop.getTotalDryers(),
                savedShop.getIsActive(),
                savedShop.getRating(),
                savedShop.getReviewCount(),
                savedShop.getBaseShippingFee(),
                savedShop.getExtraShippingFeePerKm(),
                savedShop.getMaxDeliveryDistance(),
                serviceDTOs
        );
    }

    @Override
    @Transactional
    public ShopResponseDTO updateShop(Long ownerId, com.laundry.dto.request.UpdateShopRequestDTO request) {
        Shop shop = shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("KhÃ´ng tÃ¬m tháº¥y tiá»‡m cá»§a báº¡n."));

        String oldCoverImage = shop.getCoverImage();
        List<String> oldGalleryImages = shop.getGalleryImages() != null ? new java.util.ArrayList<>(shop.getGalleryImages()) : new java.util.ArrayList<>();

        shop.setName(request.name());
        shop.setAddress(request.address());
        shop.setLatitude(request.latitude());
        shop.setLongitude(request.longitude());
        shop.setPhone(request.phone());
        shop.setCoverImage(request.coverImage());
        if (request.galleryImages() != null) {
            shop.setGalleryImages(request.galleryImages());
        }
        shop.setOperatingHours(request.operatingHours());
        shop.setTotalWashers(request.totalWashers());
        shop.setTotalDryers(request.totalDryers());
        
        if (request.baseShippingFee() != null) shop.setBaseShippingFee(request.baseShippingFee());
        if (request.extraShippingFeePerKm() != null) shop.setExtraShippingFeePerKm(request.extraShippingFeePerKm());
        if (request.maxDeliveryDistance() != null) shop.setMaxDeliveryDistance(request.maxDeliveryDistance());
        
        if (request.isActive() != null) {
            shop.setIsActive(request.isActive());
        }

        Shop savedShop = shopRepository.save(shop);

        if (oldCoverImage != null && !oldCoverImage.equals(savedShop.getCoverImage())) {
            cloudinaryService.deleteImageAsync(oldCoverImage);
        }
        if (savedShop.getGalleryImages() != null) {
            oldGalleryImages.removeAll(savedShop.getGalleryImages());
        }
        for (String url : oldGalleryImages) {
            cloudinaryService.deleteImageAsync(url);
        }

        List<LaundryService> services = laundryServiceRepository.findByShopId(savedShop.getId());
        List<ServiceDTO> serviceDTOs = services.stream()
                .map(ls -> new ServiceDTO(ls.getId(), ls.getName(), ls.getUnit() != null ? ls.getUnit().getName() : "", ls.getPrice()))
                .collect(Collectors.toList());

        return new ShopResponseDTO(
                savedShop.getId(),
                savedShop.getName(),
                savedShop.getAddress(),
                savedShop.getLatitude(),
                savedShop.getLongitude(),
                0.0,
                savedShop.getPhone(),
                savedShop.getCoverImage(),
                savedShop.getGalleryImages(),
                savedShop.getOperatingHours(),
                savedShop.getTotalWashers(),
                savedShop.getTotalDryers(),
                savedShop.getIsActive(),
                savedShop.getRating(),
                savedShop.getReviewCount(),
                savedShop.getBaseShippingFee(),
                savedShop.getExtraShippingFeePerKm(),
                savedShop.getMaxDeliveryDistance(),
                serviceDTOs
        );
    }
}