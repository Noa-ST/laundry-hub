package com.laundry.controller;

import com.laundry.dto.request.AdminResolveDisputeRequest;
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

@RestController
@RequestMapping("/api/v1/admin/disputes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDisputeController {

    private final DisputeService disputeService;

    @GetMapping
    public ResponseEntity<Page<DisputeResponse>> getAdminDisputes(
            @RequestParam(required = false) DisputeStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(disputeService.getAdminDisputes(status, pageable));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<DisputeResponse> resolveDispute(
            @PathVariable Long id,
            @Valid @RequestBody AdminResolveDisputeRequest request) {
        return ResponseEntity.ok(disputeService.adminResolve(id, request));
    }
}
