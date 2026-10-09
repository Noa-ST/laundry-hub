package com.laundry.repository;

import com.laundry.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    List<Voucher> findByShopIdOrderByCreatedAtDesc(Long shopId);
    Optional<Voucher> findByShopIdAndCode(Long shopId, String code);
    Optional<Voucher> findByIdAndShopId(Long id, Long shopId);
    
    @org.springframework.data.jpa.repository.Query("SELECT v FROM Voucher v WHERE v.shop.id = :shopId AND v.isActive = true AND CURRENT_TIMESTAMP >= v.startDate AND CURRENT_TIMESTAMP <= v.endDate")
    List<Voucher> findActiveVouchersForShop(@org.springframework.data.repository.query.Param("shopId") Long shopId);
}
