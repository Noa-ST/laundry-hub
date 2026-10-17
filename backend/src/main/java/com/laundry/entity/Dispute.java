package com.laundry.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.laundry.enums.DisputeReason;
import com.laundry.enums.DisputeStatus;

@Entity
@Table(name = "disputes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dispute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DisputeReason reason;

    @Column(length = 1000)
    private String description;

    @ElementCollection
    @CollectionTable(name = "dispute_evidences", joinColumns = @JoinColumn(name = "dispute_id"))
    @Column(name = "evidence_url")
    private List<String> evidenceUrls;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private DisputeStatus status = DisputeStatus.OPEN;

    @Column(precision = 12, scale = 2)
    private BigDecimal requestedAmount;

    @Column(precision = 12, scale = 2)
    private BigDecimal acceptedAmount;

    @Column(length = 1000)
    private String shopResponseNote;

    @ElementCollection
    @CollectionTable(name = "dispute_shop_evidences", joinColumns = @JoinColumn(name = "dispute_id"))
    @Column(name = "shop_evidence_url")
    private List<String> shopEvidenceUrls;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private com.laundry.enums.RefundMethod refundMethod;

    @Column(length = 100)
    private String bankName;

    @Column(length = 50)
    private String bankAccountNumber;

    @Column(length = 100)
    private String bankAccountName;

    @Column(length = 500)
    private String refundProofUrl;

    @Column(length = 50)
    private String compensationVoucherCode;

    @Column(length = 1000)
    private String adminDecisionNote;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
