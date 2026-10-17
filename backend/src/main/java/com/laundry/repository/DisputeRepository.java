package com.laundry.repository;

import com.laundry.entity.Dispute;
import com.laundry.enums.DisputeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, Long> {
    Optional<Dispute> findByOrderId(Long orderId);
    
    Page<Dispute> findByCustomerId(Long customerId, Pageable pageable);
    
    Page<Dispute> findByShopId(Long shopId, Pageable pageable);
    
    Page<Dispute> findByShopIdAndStatus(Long shopId, DisputeStatus status, Pageable pageable);
    
    Page<Dispute> findByStatus(DisputeStatus status, Pageable pageable);
}
