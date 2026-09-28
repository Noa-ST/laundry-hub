package com.laundry.service.impl;

import com.laundry.dto.response.ServiceDTO;
import com.laundry.dto.response.ShopResponseDTO;
import com.laundry.entity.LaundryService;
import com.laundry.entity.Shop;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.service.ShopService;
import com.laundry.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShopServiceImpl implements ShopService {

    private final ShopRepository shopRepository;
    private final LaundryServiceRepository laundryServiceRepository;

    @Override
    public List<ShopResponseDTO> findNearbyShops(Double lat, Double lng, Double radius) {
        List<Shop> allShops = shopRepository.findByIsActiveTrue();
        
        // Tính khoảng cách và lọc trong radius
        record ShopWithDistance(Shop shop, Double distance) {}
        
        List<ShopWithDistance> nearbyShops = allShops.stream()
                .map(shop -> {
                    double distance = GeoUtils.calculateDistance(lat, lng, shop.getLatitude(), shop.getLongitude());
                    return new ShopWithDistance(shop, distance);
                })
                .filter(swd -> swd.distance() <= radius)
                .sorted((a, b) -> a.distance().compareTo(b.distance()))
                .collect(Collectors.toList());

        List<Long> shopIds = nearbyShops.stream()
                .map(swd -> swd.shop().getId())
                .collect(Collectors.toList());

        // Batch get services để chống N+1 Query
        List<LaundryService> services = laundryServiceRepository.findByShopIdIn(shopIds);
        Map<Long, List<ServiceDTO>> servicesByShop = services.stream()
                .collect(Collectors.groupingBy(
                        ls -> ls.getShop().getId(),
                        Collectors.mapping(ls -> new ServiceDTO(ls.getId(), ls.getName(), ls.getUnit(), ls.getPrice()), Collectors.toList())
                ));

        return nearbyShops.stream()
                .map(swd -> {
                    // Làm tròn 1 chữ số thập phân
                    double roundedDistance = Math.round(swd.distance() * 10.0) / 10.0;
                    return new ShopResponseDTO(
                            swd.shop().getId(),
                            swd.shop().getName(),
                            swd.shop().getAddress(),
                            swd.shop().getLatitude(),
                            swd.shop().getLongitude(),
                            roundedDistance,
                            servicesByShop.getOrDefault(swd.shop().getId(), List.of())
                    );
                })
                .collect(Collectors.toList());
    }
}
