package com.laundry.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.laundry.entity.Order;
import com.laundry.enums.PaymentStatus;
import com.laundry.exception.BadRequestException;
import com.laundry.repository.OrderRepository;
import com.laundry.service.NotificationService;
import com.laundry.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.TreeMap;

@Slf4j
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

        try {
            Long currentUserId = com.laundry.security.SecurityUtils.getCurrentUserId();
            boolean isCustomer = order.getCustomer() != null && order.getCustomer().getId().equals(currentUserId);
            boolean isShopOwner = order.getShop() != null && order.getShop().getOwner() != null && order.getShop().getOwner().getId().equals(currentUserId);
            if (!isCustomer && !isShopOwner) {
                throw new BadRequestException("Bạn không có quyền thao tác thanh toán cho đơn hàng này.");
            }
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Vui lòng đăng nhập để thanh toán.");
        }

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
    @SuppressWarnings("unchecked")
    public void handleWebhook(Map<String, Object> body) {
        if (checksumKey == null || checksumKey.isBlank()) {
            log.warn("Từ chối webhook PayOS: chưa cấu hình payos.checksum-key");
            throw new BadRequestException("Chưa cấu hình xác thực webhook PayOS.");
        }
        if (body == null || !(body.get("data") instanceof Map) || !(body.get("signature") instanceof String)) {
            throw new BadRequestException("Webhook PayOS không hợp lệ.");
        }

        Map<String, Object> data = (Map<String, Object>) body.get("data");
        String signature = (String) body.get("signature");

        // 1. Xác thực chữ ký: chỉ PayOS (nắm checksum key) mới tạo được chữ ký hợp lệ
        if (!isValidWebhookSignature(data, signature)) {
            log.warn("Từ chối webhook PayOS: sai chữ ký. orderCode={}", data.get("orderCode"));
            throw new BadRequestException("Chữ ký webhook PayOS không hợp lệ.");
        }

        // 2. Chỉ xử lý giao dịch thành công
        boolean success = "00".equals(String.valueOf(body.get("code")))
                && (data.get("code") == null || "00".equals(String.valueOf(data.get("code"))));
        if (!success || data.get("orderCode") == null) {
            return;
        }

        Long orderCode;
        try {
            orderCode = Long.valueOf(data.get("orderCode").toString());
        } catch (NumberFormatException e) {
            throw new BadRequestException("orderCode không hợp lệ.");
        }

        // PayOS gửi webhook test (orderCode mẫu) khi xác nhận URL -> không tìm thấy đơn thì bỏ qua, vẫn trả 200
        Order order = orderRepository.findByPayosOrderCode(orderCode).orElse(null);
        if (order == null) {
            log.info("Webhook PayOS: không tìm thấy đơn với payosOrderCode={}", orderCode);
            return;
        }

        // 3. Idempotent: PayOS có thể gửi lại cùng một webhook nhiều lần
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            return;
        }

        Object paidAmount = data.get("amount");
        if (paidAmount != null && order.getFinalTotalPrice() != null
                && !String.valueOf(order.getFinalTotalPrice().intValue()).equals(String.valueOf(paidAmount))) {
            log.warn("Webhook PayOS: số tiền thanh toán ({}) khác tổng tiền hiện tại của đơn #{} ({})",
                    paidAmount, order.getId(), order.getFinalTotalPrice());
        }

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

    /**
     * Xác thực chữ ký webhook theo chuẩn PayOS:
     * sắp xếp các trường của "data" theo alphabet, nối dạng key1=value1&key2=value2
     * (null -> chuỗi rỗng, mảng -> JSON), rồi HMAC-SHA256 với checksum key.
     */
    private boolean isValidWebhookSignature(Map<String, Object> data, String signature) {
        try {
            String dataStr = new TreeMap<>(data).entrySet().stream()
                    .map(e -> e.getKey() + "=" + toSignatureValue(e.getValue()))
                    .collect(Collectors.joining("&"));
            String expected = generateHmacSHA256(dataStr, checksumKey);
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("Lỗi khi xác thực chữ ký webhook PayOS", e);
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private String toSignatureValue(Object value) {
        if (value == null) return "";
        try {
            if (value instanceof List<?> list) {
                List<Object> normalized = list.stream()
                        .map(v -> v instanceof Map ? new TreeMap<>((Map<String, Object>) v) : v)
                        .collect(Collectors.toList());
                return objectMapper.writeValueAsString(normalized);
            }
            if (value instanceof Map) {
                return objectMapper.writeValueAsString(new TreeMap<>((Map<String, Object>) value));
            }
        } catch (Exception e) {
            log.warn("Lỗi serialize trường ký webhook PayOS: {}", e.getMessage());
        }
        String str = String.valueOf(value);
        return ("null".equals(str) || "undefined".equals(str)) ? "" : str;
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
