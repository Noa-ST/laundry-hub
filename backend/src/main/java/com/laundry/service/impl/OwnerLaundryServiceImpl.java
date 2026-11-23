package com.laundry.service.impl;

import com.laundry.dto.request.CreateLaundryServiceRequestDTO;
import com.laundry.dto.request.UpdateLaundryServiceRequestDTO;
import com.laundry.dto.response.CategoryResponseDTO;
import com.laundry.dto.response.LaundryServiceResponseDTO;
import com.laundry.dto.response.UnitResponseDTO;
import com.laundry.entity.LaundryService;
import com.laundry.entity.PriceType;
import com.laundry.entity.ServiceCategory;
import com.laundry.entity.ServiceUnit;
import com.laundry.entity.Shop;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.ServiceCategoryRepository;
import com.laundry.repository.ServiceUnitRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.service.OwnerLaundryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OwnerLaundryServiceImpl implements OwnerLaundryService {

    private final LaundryServiceRepository laundryServiceRepository;
    private final ShopRepository shopRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final ServiceUnitRepository unitRepository;

    private Shop getShopByOwnerId(Long ownerId) {
        return shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bạn chưa thiết lập tiệm giặt."));
    }

    private LaundryServiceResponseDTO mapToDTO(LaundryService s) {
        CategoryResponseDTO catDTO = s.getCategory() != null ? new CategoryResponseDTO(s.getCategory().getId(), s.getCategory().getName(), s.getCategory().getDisplayOrder()) : null;
        UnitResponseDTO unitDTO = s.getUnit() != null ? new UnitResponseDTO(s.getUnit().getId(), s.getUnit().getName(), s.getUnit().getIsDefault()) : null;
        return new LaundryServiceResponseDTO(
                s.getId(), s.getName(), catDTO, unitDTO, s.getPriceType(), s.getPrice(), s.getMinCharge(), s.getDescription(), s.getIsActive()
        );
    }

    @Override
    public List<LaundryServiceResponseDTO> getMyServices(Long ownerId, Long categoryId) {
        Shop shop = getShopByOwnerId(ownerId);
        List<LaundryService> services = laundryServiceRepository.findByShopId(shop.getId());
        if (categoryId != null) {
            services = services.stream().filter(s -> s.getCategory() != null && s.getCategory().getId().equals(categoryId)).collect(Collectors.toList());
        }
        return services.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public LaundryServiceResponseDTO createService(Long ownerId, CreateLaundryServiceRequestDTO request) {
        Shop shop = getShopByOwnerId(ownerId);
        PriceType resolvedPriceType = request.priceType() != null ? request.priceType() : PriceType.FIXED;

        if (resolvedPriceType == PriceType.FIXED && (request.price() == null || request.price() <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá cố định phải lớn hơn 0");
        }

        ServiceCategory category = null;
        if (request.categoryId() != null) {
            category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục"));
            if (!category.getShop().getId().equals(shop.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Danh mục không thuộc tiệm của bạn");
            }
        }
        
        ServiceUnit unit = null;
        if (request.unitId() != null) {
            unit = unitRepository.findById(request.unitId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn vị tính"));
            if (!unit.getShop().getId().equals(shop.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn vị tính không thuộc tiệm của bạn");
            }
        }

        LaundryService service = LaundryService.builder()
                .shop(shop)
                .name(request.name())
                .category(category)
                .unit(unit)
                .priceType(resolvedPriceType)
                .price(resolvedPriceType == PriceType.CONTACT ? null : request.price())
                .minCharge(request.minCharge())
                .description(request.description())
                .isActive(true)
                .build();
                
        service = laundryServiceRepository.save(service);
        return mapToDTO(service);
    }

    @Override
    @Transactional
    public LaundryServiceResponseDTO updateService(Long ownerId, Long serviceId, UpdateLaundryServiceRequestDTO request) {
        Shop shop = getShopByOwnerId(ownerId);
        
        LaundryService service = laundryServiceRepository.findById(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy dịch vụ"));
                
        if (!service.getShop().getId().equals(shop.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền quản lý dịch vụ của tiệm này.");
        }

        PriceType resolvedPriceType = request.priceType() != null ? request.priceType() : PriceType.FIXED;
        if (resolvedPriceType == PriceType.FIXED && (request.price() == null || request.price() <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá cố định phải lớn hơn 0");
        }

        ServiceCategory category = null;
        if (request.categoryId() != null) {
            category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục"));
            if (!category.getShop().getId().equals(shop.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Danh mục không thuộc tiệm của bạn");
            }
        }
        
        ServiceUnit unit = null;
        if (request.unitId() != null) {
            unit = unitRepository.findById(request.unitId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn vị tính"));
            if (!unit.getShop().getId().equals(shop.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn vị tính không thuộc tiệm của bạn");
            }
        }

        service.setName(request.name());
        service.setCategory(category);
        service.setUnit(unit);
        service.setPriceType(resolvedPriceType);
        service.setPrice(resolvedPriceType == PriceType.CONTACT ? null : request.price());
        service.setMinCharge(request.minCharge());
        service.setDescription(request.description());
        service.setIsActive(request.isActive() != null ? request.isActive() : service.getIsActive());
        
        service = laundryServiceRepository.save(service);
        return mapToDTO(service);
    }

    @Override
    @Transactional
    public void deleteService(Long ownerId, Long serviceId) {
        Shop shop = getShopByOwnerId(ownerId);
        
        LaundryService service = laundryServiceRepository.findById(serviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy dịch vụ"));
                
        if (!service.getShop().getId().equals(shop.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền quản lý dịch vụ của tiệm này.");
        }
        
        service.setIsActive(false);
        laundryServiceRepository.save(service);
    }
}