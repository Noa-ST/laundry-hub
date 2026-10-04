package com.laundry.controller;

import com.laundry.dto.request.CategoryRequestDTO;
import com.laundry.dto.response.CategoryResponseDTO;
import com.laundry.entity.User;
import com.laundry.service.OwnerCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/v1/owner/categories")
@RequiredArgsConstructor
public class OwnerCategoryController {

    private final OwnerCategoryService categoryService;

    @GetMapping
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<List<CategoryResponseDTO>> getCategories(@AuthenticationPrincipal com.laundry.security.CustomUserDetails user) {
        return ResponseEntity.ok(categoryService.getCategories(user.getId()));
    }

    @PostMapping
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<CategoryResponseDTO> createCategory(
            @AuthenticationPrincipal com.laundry.security.CustomUserDetails user,
            @Valid @RequestBody CategoryRequestDTO request) {
        return ResponseEntity.ok(categoryService.createCategory(user.getId(), request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<CategoryResponseDTO> updateCategory(
            @AuthenticationPrincipal com.laundry.security.CustomUserDetails user,
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequestDTO request) {
        return ResponseEntity.ok(categoryService.updateCategory(user.getId(), id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<Void> deleteCategory(
            @AuthenticationPrincipal com.laundry.security.CustomUserDetails user,
            @PathVariable Long id) {
        categoryService.deleteCategory(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
