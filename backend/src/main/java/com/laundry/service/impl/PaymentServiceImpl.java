package com.laundry.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.laundry.entity.Order;
import com.laundry.enums.PaymentStatus;
import com.laundry.repository.OrderRepository;
import com.laundry.service.NotificationService;
import com.laundry.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    @Value("${payos.checksum-key:}")
    private String checksumKey;

    @Override
    @Transactional
    public Map<String, Object> createPaymentLink(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalArgumentException("Đơn hàng đã thanh toán");
        }

        long payosOrderCode = Long.parseLong(order.getId() + "" + (System.currentTimeMillis() % 10000));
        order.setPayosOrderCode(payosOrderCode);
        orderRepository.save(order);

        Map<String, Object> response = new HashMap<>();
        
        int amount = order.getFinalTotalPrice() != null ? order.getFinalTotalPrice().intValue() : 0;

        if (clientId == null || clientId.trim().isEmpty()) {
            response.put("qrCode", "00020101021238580010A000000727012800069704070114190333333333330208QRIBFTTA53037045405" + amount + "5802VN62140810ORD" + order.getId() + "6304CAAF"); 
            response.put("amount", amount);
            response.put("accountNumber", "0123456789");
            response.put("accountName", "LAUNDRY HUB (MOCK)");
            response.put("orderCode", payosOrderCode);
            return response;
        }

        try {
            String fullOrderCode = String.format("ORD-%04d", order.getId());
            String description = ("Thanh toan " + fullOrderCode);
            String returnUrl = "http://localhost:5173/orders";
            String cancelUrl = "http://localhost:5173/orders";

            // Tạo chữ ký (Signature)
            Map<String, Object> signData = new TreeMap<>();
            signData.put("amount", amount);
            signData.put("cancelUrl", cancelUrl);
            signData.put("description", description);
            signData.put("orderCode", payosOrderCode);
            signData.put("returnUrl", returnUrl);

            String dataStr = signData.entrySet().stream()
                    .map(e -> e.getKey() + "=" + e.getValue())
                    .collect(Collectors.joining("&"));
                    
            String signature = generateHmacSHA256(dataStr, checksumKey);

            Map<String, Object> requestBody = new HashMap<>(signData);
            requestBody.put("signature", signature);

            HttpHeaders headers = new HttpHeaders();
            headers.set("x-client-id", clientId);
            headers.set("x-api-key", apiKey);
            headers.set("Content-Type", "application/json");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> apiRes = restTemplate.exchange(
                    "https://api-merchant.payos.vn/v2/payment-requests",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> body = apiRes.getBody();
            if (body != null && "00".equals(body.get("code"))) {
                Map<String, Object> data = (Map<String, Object>) body.get("data");
                response.put("qrCode", data.get("qrCode"));
                response.put("amount", data.get("amount"));
                response.put("accountNumber", data.get("accountNumber"));
                response.put("accountName", data.get("accountName"));
                response.put("orderCode", payosOrderCode);
                return response;
            } else {
                throw new RuntimeException("PayOS Error: " + (body != null ? body.get("desc") : "Unknown"));
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo link thanh toán: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void handleWebhook(Map<String, Object> body) {
        try {
            Map<String, Object> data = (Map<String, Object>) body.get("data");
            String code = (String) body.get("code");
            
            if ("00".equals(code) && data != null) {
                Long orderCode = Long.valueOf(data.get("orderCode").toString());
                Order order = orderRepository.findByPayosOrderCode(orderCode).orElse(null);
                if (order != null) {
                    order.setPaymentStatus(PaymentStatus.PAID);
                    order.setPaidAt(java.time.Instant.now());
                    orderRepository.save(order);
                    
                    if (order.getCustomer() != null) {
                        notificationService.sendOrderNotification(
                            order.getCustomer().getId(),
                            "Cập nhật đơn hàng",
                            "Đơn hàng #ORD-" + String.format("%04d", order.getId()) + " đã thanh toán thành công.",
                            order.getId()
                        );
                    }
                    if (order.getShop() != null && order.getShop().getOwner() != null) {
                        notificationService.sendOrderNotification(
                            order.getShop().getOwner().getId(),
                            "Cập nhật đơn hàng",
                            "Đơn hàng #ORD-" + String.format("%04d", order.getId()) + " đã được thanh toán (PayOS).",
                            order.getId()
                        );
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    private String generateHmacSHA256(String data, String key) throws Exception {
        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secret_key = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        sha256_HMAC.init(secret_key);
        byte[] hash = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if(hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
