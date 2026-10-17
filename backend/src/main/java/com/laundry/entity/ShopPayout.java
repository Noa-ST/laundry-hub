package com.laundry.entity;

import com.laundry.enums.PayoutStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "shop_payouts", indexes = {
    @Index(name = "idx_payout_shop", columnList = "shop_id"),
    @Index(name = "idx_payout_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopPayout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @Column(nullable = false)
    private LocalDate periodStart;

    @Column(nullable = false)
    private LocalDate periodEnd;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalOrders = 0;

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal grossAmount; // Tổng tiền VietQR khách thanh toán

    @Column(nullable = false)
    @Builder.Default
    private Double platformFeeRate = 5.0; // Tỷ lệ hoa hồng sàn (%)

    @Column(precision = 12, scale = 2)
    private BigDecimal platformFeeAmount; // Tiền hoa hồng sàn giữ lại

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal netPayoutAmount; // Tiền thực tế chuyển cho Shop = gross - fee

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PayoutStatus status = PayoutStatus.PENDING;

    @Column(length = 500)
    private String proofImageUrl; // Ảnh chụp bill/ủy nhiệm chi chuyển khoản của Admin

    @Column(length = 500)
    private String note; // Ghi chú của Admin

    private LocalDateTime paidAt; // Thời điểm Admin thực hiện giải ngân

    // Snapshot thông tin tài khoản ngân hàng lúc chốt đợt
    @Column(length = 100)
    private String bankName;

    @Column(length = 50)
    private String bankAccountNumber;

    @Column(length = 100)
    private String bankAccountName;

    @OneToMany(mappedBy = "payout")
    @Builder.Default
    private List<Order> orders = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
