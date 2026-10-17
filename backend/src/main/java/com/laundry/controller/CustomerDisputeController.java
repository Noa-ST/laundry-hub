package com.laundry.controller;

import com.laundry.dto.request.CreateDisputeRequest;
import com.laundry.dto.response.DisputeResponse;
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
@RequestMapping("/api/v1/customer/disputes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerDisputeController {

    private final DisputeService disputeService;

    @PostMapping("/orders/{orderId}")
    public ResponseEntity<DisputeResponse> createDispute(
            Principal principal,
            @PathVariable Long orderId,
            @Valid @RequestBody CreateDisputeRequest request) {
        return ResponseEntity.ok(disputeService.createDispute(principal.getName(), orderId, request));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<DisputeResponse> getDisputeByOrderId(
            Principal principal,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(disputeService.getDisputeByOrderId(principal.getName(), orderId));
    }

    @GetMapping
    public ResponseEntity<Page<DisputeResponse>> getCustomerDisputes(
            Principal principal,
            Pageable pageable) {
        return ResponseEntity.ok(disputeService.getCustomerDisputes(principal.getName(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DisputeResponse> getDisputeById(
            Principal principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(disputeService.getDisputeById(principal.getName(), id));
    }

    @PostMapping("/{id}/escalate")
    public ResponseEntity<DisputeResponse> escalateToAdmin(
            Principal principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(disputeService.escalateToAdmin(principal.getName(), id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<DisputeResponse> cancelDispute(
            Principal principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(disputeService.cancelDispute(principal.getName(), id));
    }
}
