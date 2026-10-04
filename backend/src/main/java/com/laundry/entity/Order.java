package com.laundry.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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
    private BigDecimal estimatedTotalPrice; // Giữ lại cho tương thích DTO cũ nếu cần

    @Column(precision = 12, scale = 2)
    private BigDecimal actualTotalPrice;

    @Column(precision = 12, scale = 2)
    private BigDecimal serviceFee;

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2)
    private BigDecimal finalTotalPrice;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private InboundMethod inboundMethod;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private OutboundMethod outboundMethod;

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

    @Column(length = 1000)
    private String cancelReason;

    @Builder.Default
    private Boolean isPaid = false;

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
}
