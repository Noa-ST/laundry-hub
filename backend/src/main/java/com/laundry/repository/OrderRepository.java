package com.laundry.repository;

import com.laundry.entity.Order;
import com.laundry.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    @Query("SELECT o FROM Order o WHERE o.shop.owner.id = :ownerId ORDER BY o.createdAt DESC")
    List<Order> findByShopOwnerIdOrderByCreatedAtDesc(@Param("ownerId") Long ownerId);

    @Query("SELECT o FROM Order o WHERE o.shop.owner.id = :ownerId AND o.status = :status ORDER BY o.createdAt DESC")
    List<Order> findByShopOwnerIdAndStatusOrderByCreatedAtDesc(@Param("ownerId") Long ownerId, @Param("status") OrderStatus status);
}
