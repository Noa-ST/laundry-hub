package com.laundry.service.impl;

import com.laundry.dto.request.UnitRequestDTO;
import com.laundry.dto.response.UnitResponseDTO;
import com.laundry.entity.LaundryService;
import com.laundry.entity.ServiceUnit;
import com.laundry.entity.Shop;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.ServiceUnitRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.service.OwnerUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OwnerUnitServiceImpl implements OwnerUnitService {
    private final ServiceUnitRepository unitRepository;
    private final ShopRepository shopRepository;
    private final LaundryServiceRepository laundryServiceRepository;

    private Shop getShopByOwnerId(Long ownerId) {
        return shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bạn chưa thiết lập tiệm giặt."));
    }

    @Override
    public List<UnitResponseDTO> getUnits(Long ownerId) {
        Shop shop = getShopByOwnerId(ownerId);
        return unitRepository.findByShopId(shop.getId()).stream()
                .map(u -> new UnitResponseDTO(u.getId(), u.getName(), u.getIsDefault()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UnitResponseDTO createUnit(Long ownerId, UnitRequestDTO request) {
        Shop shop = getShopByOwnerId(ownerId);
        ServiceUnit unit = ServiceUnit.builder()
                .name(request.name())
                .isDefault(false)
                .shop(shop)
                .build();
        unit = unitRepository.save(unit);
        return new UnitResponseDTO(unit.getId(), unit.getName(), unit.getIsDefault());
    }

    @Override
    @Transactional
    public void deleteUnit(Long ownerId, Long id) {
        Shop shop = getShopByOwnerId(ownerId);
        ServiceUnit unit = unitRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn vị."));
        if (!unit.getShop().getId().equals(shop.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền quản lý đơn vị của tiệm này.");
        }
        List<LaundryService> services = laundryServiceRepository.findByShopId(shop.getId());
        boolean isUsed = services.stream().anyMatch(s -> s.getUnit() != null && s.getUnit().getId().equals(id));
        if (isUsed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn vị đang được sử dụng trong dịch vụ, không thể xóa.");
        }
        unitRepository.delete(unit);
    }
}
