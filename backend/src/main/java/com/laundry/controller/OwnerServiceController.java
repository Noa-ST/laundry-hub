package com.laundry.controller;

import com.laundry.dto.request.CreateLaundryServiceRequestDTO;
import com.laundry.dto.request.UpdateLaundryServiceRequestDTO;
import com.laundry.dto.response.LaundryServiceResponseDTO;
import com.laundry.entity.User;
import com.laundry.service.OwnerLaundryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/v1/owner/services")
@RequiredArgsConstructor
public class OwnerServiceController {

    private final OwnerLaundryService laundryService;

    @GetMapping
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<List<LaundryServiceResponseDTO>> getMyServices(
            @AuthenticationPrincipal com.laundry.security.CustomUserDetails user,
            @RequestParam(required = false) Long categoryId) {
        return ResponseEntity.ok(laundryService.getMyServices(user.getId(), categoryId));
    }

    @PostMapping
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<LaundryServiceResponseDTO> createService(
            @AuthenticationPrincipal com.laundry.security.CustomUserDetails user,
            @Valid @RequestBody CreateLaundryServiceRequestDTO request) {
        return ResponseEntity.ok(laundryService.createService(user.getId(), request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<LaundryServiceResponseDTO> updateService(
            @AuthenticationPrincipal com.laundry.security.CustomUserDetails user,
            @PathVariable Long id,
            @Valid @RequestBody UpdateLaundryServiceRequestDTO request) {
        return ResponseEntity.ok(laundryService.updateService(user.getId(), id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<Void> deleteService(
            @AuthenticationPrincipal com.laundry.security.CustomUserDetails user,
            @PathVariable Long id) {
        laundryService.deleteService(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}