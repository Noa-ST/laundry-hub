package com.laundry.service;

import java.util.Map;

public interface PaymentService {
    Map<String, Object> createPaymentLink(Long orderId);
    void handleWebhook(Map<String, Object> body);
}
