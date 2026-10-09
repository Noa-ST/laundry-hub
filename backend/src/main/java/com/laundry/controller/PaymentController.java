package com.laundry.controller;

import com.laundry.dto.response.ApiResponse;
import com.laundry.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create-qr/{orderId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createQr(@PathVariable Long orderId) {
        Map<String, Object> response = paymentService.createPaymentLink(orderId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/payos-webhook")
    public ResponseEntity<Map<String, Boolean>> handleWebhook(@RequestBody Map<String, Object> body) {
        paymentService.handleWebhook(body);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
