package com.laundry.service;

import com.laundry.dto.request.CategoryRequestDTO;
import com.laundry.dto.response.CategoryResponseDTO;

import java.util.List;

public interface OwnerCategoryService {
    List<CategoryResponseDTO> getCategories(Long ownerId);
    CategoryResponseDTO createCategory(Long ownerId, CategoryRequestDTO request);
    CategoryResponseDTO updateCategory(Long ownerId, Long id, CategoryRequestDTO request);
    void deleteCategory(Long ownerId, Long id);
}
