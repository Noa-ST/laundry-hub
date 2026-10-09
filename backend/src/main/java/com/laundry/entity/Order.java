package com.laundry.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.laundry.enums.*;

@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_status", columnList = "status"),
    @Index(name = "idx_order_customer_id", columnList = "customer_id"),
    @Index(name = "idx_order_shop_id", columnList = "shop_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime bookingTime;

    private Double estimatedWeight;
    private Double actualWeight;

    @Column(precision = 12, scale = 2)
    private BigDecimal estimatedTotal; 

    @Column(precision = 12, scale = 2)
    private BigDecimal actualTotalPrice;

    @Column(precision = 12, scale = 2)
    private BigDecimal serviceFee;

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_id")
    private Voucher voucher;

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2)
    private BigDecimal finalTotalPrice;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private InboundType inboundType;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private OutboundType outboundType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.COD;

    @Column(length = 100)
    private String receiverName;

    @Column(length = 20)
    private String receiverPhone;

    @Column(length = 500)
    private String deliveryAddress;

    @Column(length = 1000)
    private String note;

    @Column(length = 500)
    private String cancelReason;

    @Column(length = 20)
    private String cancelledBy;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "payos_order_code", unique = true)
    private Long payosOrderCode;

    private Instant paidAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();
    
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }
    
    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Review review;
}
