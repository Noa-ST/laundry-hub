package com.laundry.controller;

import com.laundry.entity.Order;
import com.laundry.entity.Role;
import com.laundry.entity.Shop;
import com.laundry.entity.User;
import com.laundry.enums.OrderStatus;
import com.laundry.repository.OrderRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final OrderRepository orderRepository;
    private final com.laundry.service.NotificationService notificationService;

    // --- USER MANAGEMENT ---

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> users = userRepository.findAll(pageable);
        
        // Don't expose passwords
        var safeUsers = users.map(u -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", u.getId());
            map.put("fullName", u.getFullName() != null ? u.getFullName() : "");
            map.put("email", u.getEmail() != null ? u.getEmail() : "");
            map.put("phone", u.getPhone() != null ? u.getPhone() : "");
            map.put("avatarUrl", u.getAvatarUrl() != null ? u.getAvatarUrl() : "");
            map.put("role", u.getRole() != null ? u.getRole().name() : "");
            map.put("isActive", u.getIsActive() != null ? u.getIsActive() : true);
            map.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : "");
            return map;
        });
        
        return ResponseEntity.ok(safeUsers);
    }

    @PutMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole() == Role.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot toggle admin status"));
        }
        boolean currentStatus = user.getIsActive() != null ? user.getIsActive() : true;
        user.setIsActive(!currentStatus);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Cập nhật trạng thái thành công", "isActive", user.getIsActive()));
    }

    // --- SHOP MANAGEMENT ---

    @GetMapping("/shops")
    public ResponseEntity<?> getAllShops(
            @RequestParam(required = false) com.laundry.enums.ShopApprovalStatus approvalStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Shop> shops = (approvalStatus != null)
                ? shopRepository.findByApprovalStatus(approvalStatus, pageable)
                : shopRepository.findAll(pageable);

        var safeShops = shops.map(s -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", s.getId());
            map.put("name", s.getName() != null ? s.getName() : "");
            map.put("ownerName", s.getOwner() != null ? s.getOwner().getFullName() : "");
            map.put("ownerPhone", s.getOwner() != null ? s.getOwner().getPhone() : "");
            map.put("address", s.getAddress() != null ? s.getAddress() : "");
            map.put("phone", s.getPhone() != null ? s.getPhone() : "");
            map.put("coverImage", s.getCoverImage() != null ? s.getCoverImage() : "");
            map.put("operatingHours", s.getOperatingHours() != null ? s.getOperatingHours() : "");
            map.put("totalWashers", s.getTotalWashers() != null ? s.getTotalWashers() : 0);
            map.put("totalDryers", s.getTotalDryers() != null ? s.getTotalDryers() : 0);
            map.put("approvalStatus", s.getApprovalStatus() != null ? s.getApprovalStatus().name() : "APPROVED");
            map.put("rejectionReason", s.getRejectionReason() != null ? s.getRejectionReason() : "");
            map.put("approvedAt", s.getApprovedAt() != null ? s.getApprovedAt().toString() : "");
            map.put("isActive", s.getIsActive() != null ? s.getIsActive() : true);
            map.put("createdAt", s.getCreatedAt() != null ? s.getCreatedAt().toString() : "");
            map.put("rating", s.getRating() != null ? s.getRating() : 0.0);
            map.put("reviewCount", s.getReviewCount() != null ? s.getReviewCount() : 0);
            return map;
        });
        return ResponseEntity.ok(safeShops);
    }

    @GetMapping("/shops/pending-count")
    public ResponseEntity<?> getPendingShopsCount() {
        long count = shopRepository.countByApprovalStatus(com.laundry.enums.ShopApprovalStatus.PENDING_APPROVAL);
        return ResponseEntity.ok(Map.of("pendingCount", count));
    }

    @PutMapping("/shops/{id}/approve")
    public ResponseEntity<?> approveShop(@PathVariable Long id) {
        Shop shop = shopRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tiệm giặt"));
        shop.setApprovalStatus(com.laundry.enums.ShopApprovalStatus.APPROVED);
        shop.setApprovedAt(LocalDateTime.now());
        shop.setRejectionReason(null);
        shop.setIsActive(true);
        shopRepository.save(shop);

        if (shop.getOwner() != null) {
            notificationService.sendNotification(
                    shop.getOwner().getId(),
                    "Tiệm giặt đã được phê duyệt!",
                    "Chúc mừng! Tiệm '" + shop.getName() + "' của bạn đã được Ban Quản Trị phê duyệt và chính thức xuất hiện trên sàn."
            );
        }

        return ResponseEntity.ok(Map.of(
                "message", "Phê duyệt tiệm thành công",
                "shopId", shop.getId(),
                "approvalStatus", shop.getApprovalStatus().name()
        ));
    }

    @PutMapping("/shops/{id}/reject")
    public ResponseEntity<?> rejectShop(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        Shop shop = shopRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tiệm giặt"));
        String reason = (body != null && body.containsKey("reason") && !body.get("reason").trim().isEmpty())
                ? body.get("reason").trim()
                : "Hồ sơ tiệm chưa đáp ứng đủ tiêu chuẩn hoạt động của hệ thống.";

        shop.setApprovalStatus(com.laundry.enums.ShopApprovalStatus.REJECTED);
        shop.setRejectionReason(reason);
        shop.setIsActive(false);
        shopRepository.save(shop);

        if (shop.getOwner() != null) {
            notificationService.sendNotification(
                    shop.getOwner().getId(),
                    "Yêu cầu mở tiệm bị từ chối",
                    "Tiệm '" + shop.getName() + "' chưa được phê duyệt. Lý do: " + reason + ". Bạn có thể chỉnh sửa thông tin tiệm và gửi yêu cầu xét duyệt lại."
            );
        }

        return ResponseEntity.ok(Map.of(
                "message", "Đã từ chối tiệm thành công",
                "shopId", shop.getId(),
                "approvalStatus", shop.getApprovalStatus().name(),
                "rejectionReason", reason
        ));
    }

    @PutMapping("/shops/{id}/toggle-status")
    public ResponseEntity<?> toggleShopStatus(@PathVariable Long id) {
        Shop shop = shopRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Shop not found"));
        boolean currentStatus = shop.getIsActive() != null ? shop.getIsActive() : true;
        boolean nextStatus = !currentStatus;
        if (nextStatus && shop.getApprovalStatus() != com.laundry.enums.ShopApprovalStatus.APPROVED) {
            throw new IllegalArgumentException("Chỉ có thể bật hoạt động cho tiệm đã được phê duyệt.");
        }
        shop.setIsActive(nextStatus);
        shopRepository.save(shop);
        return ResponseEntity.ok(Map.of("message", "Cập nhật trạng thái thành công", "isActive", shop.getIsActive()));
    }

    // --- DASHBOARD STATS ---
    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getDashboardStats() {
        List<User> users = userRepository.findAll();
        List<Shop> shops = shopRepository.findAll();
        List<Order> orders = orderRepository.findAll();

        long totalCustomers = users.stream().filter(u -> u.getRole() == Role.CUSTOMER).count();
        long totalOwners = users.stream().filter(u -> u.getRole() == Role.SHOP_OWNER).count();
        long activeShops = shops.stream().filter(s -> Boolean.TRUE.equals(s.getIsActive())).count();
        
        long totalOrders = orders.size();
        long successfulOrders = orders.stream().filter(o -> o.getStatus() == OrderStatus.COMPLETED).count();
        long canceledOrders = orders.stream().filter(o -> o.getStatus() == OrderStatus.CANCELLED).count();

        double totalRevenue = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.COMPLETED && o.getPaymentStatus() == com.laundry.enums.PaymentStatus.PAID)
                .mapToDouble(o -> o.getFinalTotalPrice() != null ? o.getFinalTotalPrice().doubleValue() : 0.0)
                .sum();

        return ResponseEntity.ok(Map.of(
            "totalUsers", users.size(),
            "totalCustomers", totalCustomers,
            "totalOwners", totalOwners,
            "totalShops", shops.size(),
            "activeShops", activeShops,
            "totalOrders", totalOrders,
            "successfulOrders", successfulOrders,
            "canceledOrders", canceledOrders,
            "totalRevenue", totalRevenue
        ));
    }
}
