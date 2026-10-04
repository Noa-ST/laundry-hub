package com.laundry.service.impl;

import com.laundry.dto.request.CategoryRequestDTO;
import com.laundry.dto.response.CategoryResponseDTO;
import com.laundry.entity.LaundryService;
import com.laundry.entity.ServiceCategory;
import com.laundry.entity.Shop;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.ServiceCategoryRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.service.OwnerCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OwnerCategoryServiceImpl implements OwnerCategoryService {
    private final ServiceCategoryRepository categoryRepository;
    private final ShopRepository shopRepository;
    private final LaundryServiceRepository laundryServiceRepository;

    private Shop getShopByOwnerId(Long ownerId) {
        return shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bạn chưa thiết lập tiệm giặt."));
    }

    @Override
    public List<CategoryResponseDTO> getCategories(Long ownerId) {
        Shop shop = getShopByOwnerId(ownerId);
        return categoryRepository.findByShopIdOrderByDisplayOrderAsc(shop.getId()).stream()
                .map(c -> new CategoryResponseDTO(c.getId(), c.getName(), c.getDisplayOrder()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CategoryResponseDTO createCategory(Long ownerId, CategoryRequestDTO request) {
        Shop shop = getShopByOwnerId(ownerId);
        ServiceCategory category = ServiceCategory.builder()
                .name(request.name())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : 0)
                .shop(shop)
                .build();
        category = categoryRepository.save(category);
        return new CategoryResponseDTO(category.getId(), category.getName(), category.getDisplayOrder());
    }

    @Override
    @Transactional
    public CategoryResponseDTO updateCategory(Long ownerId, Long id, CategoryRequestDTO request) {
        Shop shop = getShopByOwnerId(ownerId);
        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục."));
        if (!category.getShop().getId().equals(shop.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền quản lý danh mục của tiệm này.");
        }
        category.setName(request.name());
        category.setDisplayOrder(request.displayOrder() != null ? request.displayOrder() : 0);
        category = categoryRepository.save(category);
        return new CategoryResponseDTO(category.getId(), category.getName(), category.getDisplayOrder());
    }

    @Override
    @Transactional
    public void deleteCategory(Long ownerId, Long id) {
        Shop shop = getShopByOwnerId(ownerId);
        ServiceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục."));
        if (!category.getShop().getId().equals(shop.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền quản lý danh mục của tiệm này.");
        }
        List<LaundryService> services = laundryServiceRepository.findByShopId(shop.getId());
        for (LaundryService service : services) {
            if (service.getCategory() != null && service.getCategory().getId().equals(id)) {
                service.setCategory(null);
                laundryServiceRepository.save(service);
            }
        }
        categoryRepository.delete(category);
    }
}
