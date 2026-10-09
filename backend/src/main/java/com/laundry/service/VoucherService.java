package com.laundry.service;

import com.laundry.dto.request.VoucherRequestDTO;
import com.laundry.dto.response.VoucherResponseDTO;
import com.laundry.entity.Shop;
import com.laundry.entity.Voucher;
import com.laundry.exception.ResourceNotFoundException;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final ShopRepository shopRepository;

    public VoucherResponseDTO createVoucher(Long ownerId, VoucherRequestDTO request) {
        Shop shop = shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found for owner"));

        // Check if code exists
        if (voucherRepository.findByShopIdAndCode(shop.getId(), request.code()).isPresent()) {
            throw new IllegalArgumentException("Mã giảm giá đã tồn tại trong tiệm này");
        }

        Voucher voucher = Voucher.builder()
                .shop(shop)
                .code(request.code().toUpperCase())
                .discountType(Voucher.DiscountType.valueOf(request.discountType()))
                .discountValue(request.discountValue())
                .maxDiscountAmount(request.maxDiscountAmount())
                .minOrderValue(request.minOrderValue())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .usageLimit(request.usageLimit())
                .usageLimitPerUser(request.usageLimitPerUser())
                .isActive(request.isActive() != null ? request.isActive() : true)
                .usedCount(0)
                .build();

        voucher = voucherRepository.save(voucher);
        return mapToDTO(voucher);
    }

    public List<VoucherResponseDTO> getShopVouchers(Long ownerId) {
        Shop shop = shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found for owner"));

        return voucherRepository.findByShopIdOrderByCreatedAtDesc(shop.getId())
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public VoucherResponseDTO updateVoucher(Long ownerId, Long voucherId, VoucherRequestDTO request) {
        Shop shop = shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found for owner"));

        Voucher voucher = voucherRepository.findByIdAndShopId(voucherId, shop.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Voucher not found"));

        if (!voucher.getCode().equalsIgnoreCase(request.code())) {
            if (voucherRepository.findByShopIdAndCode(shop.getId(), request.code()).isPresent()) {
                throw new IllegalArgumentException("Mã giảm giá đã tồn tại trong tiệm này");
            }
            voucher.setCode(request.code().toUpperCase());
        }

        voucher.setDiscountType(Voucher.DiscountType.valueOf(request.discountType()));
        voucher.setDiscountValue(request.discountValue());
        voucher.setMaxDiscountAmount(request.maxDiscountAmount());
        voucher.setMinOrderValue(request.minOrderValue());
        voucher.setStartDate(request.startDate());
        voucher.setEndDate(request.endDate());
        voucher.setUsageLimit(request.usageLimit());
        voucher.setUsageLimitPerUser(request.usageLimitPerUser());
        if (request.isActive() != null) {
            voucher.setIsActive(request.isActive());
        }

        return mapToDTO(voucherRepository.save(voucher));
    }

    public void deleteVoucher(Long ownerId, Long voucherId) {
        Shop shop = shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
        Voucher voucher = voucherRepository.findByIdAndShopId(voucherId, shop.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Voucher not found"));
        
        voucherRepository.delete(voucher);
    }

    private VoucherResponseDTO mapToDTO(Voucher v) {
        return new VoucherResponseDTO(
                v.getId(),
                v.getCode(),
                v.getDiscountType().name(),
                v.getDiscountValue(),
                v.getMaxDiscountAmount(),
                v.getMinOrderValue(),
                v.getStartDate(),
                v.getEndDate(),
                v.getUsageLimit(),
                v.getUsageLimitPerUser(),
                v.getUsedCount(),
                v.getIsActive(),
                v.getCreatedAt()
        );
    }
}
