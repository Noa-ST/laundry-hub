package com.laundry.repository;

import com.laundry.entity.Order;
import com.laundry.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    Page<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.shop.owner.id = :ownerId ORDER BY o.createdAt DESC")
    List<Order> findByShopOwnerIdOrderByCreatedAtDesc(@Param("ownerId") Long ownerId);
    @Query("SELECT o FROM Order o WHERE o.shop.owner.id = :ownerId ORDER BY o.createdAt DESC")
    Page<Order> findByShopOwnerIdOrderByCreatedAtDesc(@Param("ownerId") Long ownerId, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.shop.owner.id = :ownerId AND o.status IN :statuses ORDER BY o.createdAt DESC")
    Page<Order> findByShopOwnerIdAndStatusInOrderByCreatedAtDesc(@Param("ownerId") Long ownerId, @Param("statuses") List<OrderStatus> statuses, Pageable pageable);

    java.util.Optional<Order> findByPayosOrderCode(Long payosOrderCode);

    long countByCustomerIdAndVoucherIdAndStatusNot(Long customerId, Long voucherId, OrderStatus status);

    @Query("SELECT o FROM Order o WHERE o.shop.owner.id = :ownerId AND o.createdAt >= :startDate AND o.createdAt <= :endDate ORDER BY o.createdAt ASC")
    List<Order> findOrdersForStatistics(
        @Param("ownerId") Long ownerId, 
        @Param("startDate") java.time.LocalDateTime startDate, 
        @Param("endDate") java.time.LocalDateTime endDate
    );

    // Điều kiện đối soát: tiền phải thực sự đi qua cổng PayOS về tài khoản Sàn (payosOrderCode != null).
    // Đơn POS khai "VietQR + đã thu" (khách chuyển thẳng cho tiệm) KHÔNG được gom vào kỳ giải ngân.
    @Query("SELECT o FROM Order o WHERE o.shop.id = :shopId AND o.status = com.laundry.enums.OrderStatus.COMPLETED AND o.paymentMethod = com.laundry.enums.PaymentMethod.VIETQR AND o.paymentStatus = com.laundry.enums.PaymentStatus.PAID AND o.payosOrderCode IS NOT NULL AND (o.payoutStatus IS NULL OR o.payoutStatus = com.laundry.enums.OrderPayoutStatus.UNSETTLED) AND o.hasDispute = false AND o.createdAt <= :cutoffTime ORDER BY o.createdAt ASC")
    List<Order> findEligibleOrdersForPayout(@Param("shopId") Long shopId, @Param("cutoffTime") java.time.LocalDateTime cutoffTime);

    List<Order> findByPayoutIdOrderByCreatedAtAsc(Long payoutId);

    @Query("SELECT o FROM Order o WHERE o.status = com.laundry.enums.OrderStatus.COMPLETED AND o.paymentMethod = com.laundry.enums.PaymentMethod.VIETQR AND o.paymentStatus = com.laundry.enums.PaymentStatus.PAID AND o.payosOrderCode IS NOT NULL AND (o.payoutStatus IS NULL OR o.payoutStatus = com.laundry.enums.OrderPayoutStatus.UNSETTLED) AND o.hasDispute = false")
    List<Order> findAllUnsettledCompletedVietQrOrders();

    @Query("SELECT o FROM Order o WHERE o.shop.owner.id = :ownerId AND o.status = com.laundry.enums.OrderStatus.COMPLETED AND o.paymentMethod = com.laundry.enums.PaymentMethod.VIETQR AND o.paymentStatus = com.laundry.enums.PaymentStatus.PAID AND o.payosOrderCode IS NOT NULL AND (o.payoutStatus IS NULL OR o.payoutStatus = com.laundry.enums.OrderPayoutStatus.UNSETTLED) AND o.hasDispute = false")
    List<Order> findUnsettledOrdersByOwnerId(@Param("ownerId") Long ownerId);
}

