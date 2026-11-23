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
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final ShopRepository shopRepository;

    @Transactional
    public VoucherResponseDTO createVoucher(Long ownerId, VoucherRequestDTO request) {
        Shop shop = shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found for owner"));

        String normalizedCode = request.code() != null ? request.code().trim().toUpperCase() : "";
        if (normalizedCode.isEmpty()) {
            throw new IllegalArgumentException("Mã giảm giá không được để trống");
        }
        validateVoucherRequest(request);

        // Check if code exists (case-insensitive via normalized uppercase)
        if (voucherRepository.findByShopIdAndCode(shop.getId(), normalizedCode).isPresent()) {
            throw new IllegalArgumentException("Mã giảm giá đã tồn tại trong tiệm này");
        }

        Voucher voucher = Voucher.builder()
                .shop(shop)
                .code(normalizedCode)
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

    @Transactional
    public VoucherResponseDTO updateVoucher(Long ownerId, Long voucherId, VoucherRequestDTO request) {
        Shop shop = shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found for owner"));

        Voucher voucher = voucherRepository.findByIdAndShopId(voucherId, shop.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Voucher not found"));

        String normalizedCode = request.code() != null ? request.code().trim().toUpperCase() : "";
        if (normalizedCode.isEmpty()) {
            throw new IllegalArgumentException("Mã giảm giá không được để trống");
        }
        validateVoucherRequest(request);

        if (!voucher.getCode().equalsIgnoreCase(normalizedCode)) {
            if (voucherRepository.findByShopIdAndCode(shop.getId(), normalizedCode).isPresent()) {
                throw new IllegalArgumentException("Mã giảm giá đã tồn tại trong tiệm này");
            }
            voucher.setCode(normalizedCode);
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

    private void validateVoucherRequest(VoucherRequestDTO request) {
        if (request.discountValue() == null || request.discountValue() <= 0) {
            throw new IllegalArgumentException("Giá trị giảm giá phải lớn hơn 0");
        }
        Voucher.DiscountType type = Voucher.DiscountType.valueOf(request.discountType());
        if (type == Voucher.DiscountType.PERCENTAGE && request.discountValue() > 100) {
            throw new IllegalArgumentException("Phần trăm giảm giá không được vượt quá 100%");
        }
        if (request.startDate() != null && request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
        }
    }

    @Transactional
    public void deleteVoucher(Long ownerId, Long voucherId) {
        Shop shop = shopRepository.findFirstByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
        Voucher voucher = voucherRepository.findByIdAndShopId(voucherId, shop.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Voucher not found"));
        
        voucher.setIsActive(false);
        voucherRepository.save(voucher);
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
                v.getCreatedAt(),
                v.getTargetUser() != null ? v.getTargetUser().getId() : null
        );
    }
}
