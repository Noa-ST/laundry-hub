package com.laundry.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "shops", indexes = {
    @Index(name = "idx_shop_location", columnList = "latitude, longitude")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Shop {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;
    
    @Column(length = 20)
    private String phone;

    @Column(length = 500)
    private String coverImage;

    @ElementCollection
    @CollectionTable(name = "shop_gallery", joinColumns = @JoinColumn(name = "shop_id"))
    @Column(name = "image_url", length = 500)
    @Builder.Default
    private List<String> galleryImages = new ArrayList<>();

    @Column(length = 50)
    private String operatingHours;

    @Column(nullable = false, columnDefinition = "integer default 1")
    @Builder.Default
    private Integer totalWashers = 1;

    @Column(nullable = false, columnDefinition = "integer default 0")
    @Builder.Default
    private Integer totalDryers = 0;

    @Column(nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "rating", columnDefinition = "numeric(3,1) default 0.0")
    @Builder.Default
    private Double rating = 0.0;

    @Column(name = "review_count", columnDefinition = "integer default 0")
    @Builder.Default
    private Integer reviewCount = 0;

    @Column(name = "base_shipping_fee", columnDefinition = "numeric(10,2) default 15000.0")
    @Builder.Default
    private Double baseShippingFee = 15000.0;

    @Column(name = "extra_shipping_fee_per_km", columnDefinition = "numeric(10,2) default 5000.0")
    @Builder.Default
    private Double extraShippingFeePerKm = 5000.0;

    @Column(name = "max_delivery_distance", columnDefinition = "numeric(5,1) default 10.0")
    @Builder.Default
    private Double maxDeliveryDistance = 10.0;

    @Column(length = 100)
    private String bankName;

    @Column(length = 50)
    private String bankAccountNumber;

    @Column(length = 100)
    private String bankAccountName;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}