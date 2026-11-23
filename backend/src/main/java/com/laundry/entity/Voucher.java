package com.laundry.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers", indexes = {
    @Index(name = "idx_voucher_shop_id", columnList = "shop_id"),
    @Index(name = "idx_voucher_code", columnList = "code")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Voucher {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    @Column(nullable = false, length = 50)
    private String code;

    public enum DiscountType {
        PERCENTAGE, FIXED_AMOUNT
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DiscountType discountType;

    @Column(nullable = false)
    private Double discountValue;

    private Double maxDiscountAmount; // Only applicable for PERCENTAGE

    private Double minOrderValue; // Minimum total order required

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    private Integer usageLimit; // Total number of times this voucher can be used

    private Integer usageLimitPerUser; // Total number of times a single user can use this voucher

    @Column(nullable = false, columnDefinition = "int default 0")
    @Builder.Default
    private Integer usedCount = 0;

    @Column(nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public boolean isValidForOrder(Double orderTotal) {
        if (!isActive) return false;
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(startDate) || now.isAfter(endDate)) return false;
        if (usageLimit != null && usedCount >= usageLimit) return false;
        if (minOrderValue != null && orderTotal < minOrderValue) return false;
        return true;
    }

    public Double calculateDiscount(Double orderTotal) {
        if (!isValidForOrder(orderTotal)) return 0.0;
        return computeDiscountAmount(orderTotal);
    }

    /**
     * Tính lại tiền giảm giá cho đơn hàng đã áp dụng voucher từ trước (khi cân đo/điều chỉnh số lượng).
     * Không kiểm tra lại usedCount >= usageLimit hay endDate vì voucher đã được ghi nhận lúc đặt đơn.
     */
    public Double calculateDiscountForExistingOrder(Double orderTotal) {
        if (orderTotal == null || orderTotal <= 0) return 0.0;
        if (minOrderValue != null && orderTotal < minOrderValue) return 0.0;
        return computeDiscountAmount(orderTotal);
    }

    private Double computeDiscountAmount(Double orderTotal) {
        if (discountType == DiscountType.FIXED_AMOUNT) {
            return Math.min(discountValue, orderTotal);
        } else {
            double discount = orderTotal * (discountValue / 100.0);
            if (maxDiscountAmount != null && discount > maxDiscountAmount) {
                return maxDiscountAmount;
            }
            return discount;
        }
    }
}
