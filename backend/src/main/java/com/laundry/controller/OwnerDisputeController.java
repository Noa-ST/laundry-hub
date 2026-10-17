package com.laundry.controller;

import com.laundry.dto.request.ShopRespondDisputeRequest;
import com.laundry.dto.response.DisputeResponse;
import com.laundry.enums.DisputeStatus;
import com.laundry.service.DisputeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/owner/disputes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SHOP_OWNER')")
public class OwnerDisputeController {

    private final DisputeService disputeService;

    @GetMapping("/shops/{shopId}")
    public ResponseEntity<Page<DisputeResponse>> getShopDisputes(
            Principal principal,
            @PathVariable Long shopId,
            @RequestParam(required = false) DisputeStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(disputeService.getShopDisputes(principal.getName(), shopId, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DisputeResponse> getDisputeById(
            Principal principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(disputeService.getDisputeById(principal.getName(), id));
    }

    @PostMapping("/{id}/respond")
    public ResponseEntity<DisputeResponse> respondToDispute(
            Principal principal,
            @PathVariable Long id,
            @Valid @RequestBody ShopRespondDisputeRequest request) {
        return ResponseEntity.ok(disputeService.shopRespond(principal.getName(), id, request));
    }
}
