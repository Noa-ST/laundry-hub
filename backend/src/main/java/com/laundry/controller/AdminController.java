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

    // --- USER MANAGEMENT ---

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> users = userRepository.findAll(pageable);
        
        // Don't expose passwords
        var safeUsers = users.map(u -> Map.of(
                "id", (Object)u.getId(),
                "fullName", (Object)(u.getFullName() != null ? u.getFullName() : ""),
                "phone", (Object)(u.getPhone() != null ? u.getPhone() : ""),
                "role", (Object)u.getRole(),
                "isActive", (Object)(u.getIsActive() != null ? u.getIsActive() : true),
                "createdAt", (Object)(u.getCreatedAt() != null ? u.getCreatedAt() : "")
        ));
        
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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Shop> shops = shopRepository.findAll(pageable);
        var safeShops = shops.map(s -> Map.of(
                "id", (Object)s.getId(),
                "name", (Object)(s.getName() != null ? s.getName() : ""),
                "ownerName", (Object)(s.getOwner() != null ? s.getOwner().getFullName() : ""),
                "address", (Object)(s.getAddress() != null ? s.getAddress() : ""),
                "isActive", (Object)(s.getIsActive() != null ? s.getIsActive() : true),
                "createdAt", (Object)(s.getCreatedAt() != null ? s.getCreatedAt() : ""),
                "rating", (Object)(s.getRating() != null ? s.getRating() : 0.0),
                "reviewCount", (Object)(s.getReviewCount() != null ? s.getReviewCount() : 0)
        ));
        return ResponseEntity.ok(safeShops);
    }

    @PutMapping("/shops/{id}/toggle-status")
    public ResponseEntity<?> toggleShopStatus(@PathVariable Long id) {
        Shop shop = shopRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Shop not found"));
        boolean currentStatus = shop.getIsActive() != null ? shop.getIsActive() : true;
        shop.setIsActive(!currentStatus);
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
        long activeShops = shops.stream().filter(s -> s.getIsActive() != null && s.getIsActive()).count();
        
        long totalOrders = orders.size();
        long successfulOrders = orders.stream().filter(o -> o.getStatus() == OrderStatus.COMPLETED).count();
        long canceledOrders = orders.stream().filter(o -> o.getStatus() == OrderStatus.CANCELLED).count();

        double totalRevenue = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.COMPLETED)
                .mapToDouble(o -> o.getFinalTotalPrice() != null ? o.getFinalTotalPrice().doubleValue() : 0.0)
                .sum();
                
        // Revenue by day for the last 7 days (mock/simple logic)
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(6).withHour(0).withMinute(0).withSecond(0);
        
        var recentOrders = orders.stream()
                .filter(o -> o.getCreatedAt().isAfter(sevenDaysAgo))
                .collect(Collectors.toList());

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
