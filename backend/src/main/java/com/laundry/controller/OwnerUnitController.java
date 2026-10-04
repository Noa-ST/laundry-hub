package com.laundry.controller;

import com.laundry.dto.request.UnitRequestDTO;
import com.laundry.dto.response.UnitResponseDTO;
import com.laundry.entity.User;
import com.laundry.service.OwnerUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/v1/owner/units")
@RequiredArgsConstructor
public class OwnerUnitController {

    private final OwnerUnitService unitService;

    @GetMapping
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<List<UnitResponseDTO>> getUnits(@AuthenticationPrincipal com.laundry.security.CustomUserDetails user) {
        return ResponseEntity.ok(unitService.getUnits(user.getId()));
    }

    @PostMapping
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<UnitResponseDTO> createUnit(
            @AuthenticationPrincipal com.laundry.security.CustomUserDetails user,
            @Valid @RequestBody UnitRequestDTO request) {
        return ResponseEntity.ok(unitService.createUnit(user.getId(), request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<Void> deleteUnit(
            @AuthenticationPrincipal com.laundry.security.CustomUserDetails user,
            @PathVariable Long id) {
        unitService.deleteUnit(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
