package com.laundry.config;

import com.laundry.entity.*;
import com.laundry.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final ShopRepository shopRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceUnitRepository serviceUnitRepository;
    private final LaundryServiceRepository laundryServiceRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        List<Shop> shops = shopRepository.findAll();
        if (shops.isEmpty()) {
            return;
        }

        Random random = new Random();

        for (Shop shop : shops) {
            // Check if shop already has services
            List<LaundryService> existingServices = laundryServiceRepository.findByShopId(shop.getId());
            if (!existingServices.isEmpty()) {
                continue; // Skip if already seeded
            }

            // Create Categories
            ServiceCategory catGiatsay = serviceCategoryRepository.save(ServiceCategory.builder()
                    .name("Giặt sấy cơ bản")
                    .displayOrder(1)
                    .shop(shop)
                    .build());

            ServiceCategory catHap = serviceCategoryRepository.save(ServiceCategory.builder()
                    .name("Giặt hấp / Veston")
                    .displayOrder(2)
                    .shop(shop)
                    .build());

            ServiceCategory catGiay = serviceCategoryRepository.save(ServiceCategory.builder()
                    .name("Giặt Giày")
                    .displayOrder(3)
                    .shop(shop)
                    .build());

            ServiceCategory catGauBong = serviceCategoryRepository.save(ServiceCategory.builder()
                    .name("Giặt Chăn ga & Gấu bông")
                    .displayOrder(4)
                    .shop(shop)
                    .build());

            // Create Units
            ServiceUnit unitKg = serviceUnitRepository.save(ServiceUnit.builder()
                    .name("Kg")
                    .shop(shop)
                    .build());

            ServiceUnit unitCai = serviceUnitRepository.save(ServiceUnit.builder()
                    .name("Cái")
                    .shop(shop)
                    .build());

            ServiceUnit unitDoi = serviceUnitRepository.save(ServiceUnit.builder()
                    .name("Đôi")
                    .shop(shop)
                    .build());

            ServiceUnit unitBo = serviceUnitRepository.save(ServiceUnit.builder()
                    .name("Bộ")
                    .shop(shop)
                    .build());

            // Create Services
            // 1. Giặt sấy
            laundryServiceRepository.save(LaundryService.builder()
                    .shop(shop)
                    .name("Giặt Sấy Lấy Liền (Quần áo < 3kg)")
                    .category(catGiatsay)
                    .unit(unitKg)
                    .priceType(PriceType.FIXED)
                    .price(15000.0)
                    .isActive(true)
                    .description("Giặt và sấy khô quần áo hằng ngày, gấp gọn.")
                    .build());

            laundryServiceRepository.save(LaundryService.builder()
                    .shop(shop)
                    .name("Giặt Sấy Quần Áo Dày (Áo khoác, jean)")
                    .category(catGiatsay)
                    .unit(unitKg)
                    .priceType(PriceType.FIXED)
                    .price(25000.0)
                    .isActive(true)
                    .description("Giặt sấy quần áo jean, kaki, áo khoác len.")
                    .build());

            // 2. Hấp
            laundryServiceRepository.save(LaundryService.builder()
                    .shop(shop)
                    .name("Giặt hấp Áo Veston")
                    .category(catHap)
                    .unit(unitCai)
                    .priceType(PriceType.FIXED)
                    .price(60000.0)
                    .isActive(true)
                    .description("Hấp tẩy cao cấp cho Veston, không làm hỏng form dáng.")
                    .build());

            laundryServiceRepository.save(LaundryService.builder()
                    .shop(shop)
                    .name("Giặt hấp Áo Cưới / Dạ hội")
                    .category(catHap)
                    .unit(unitBo)
                    .priceType(PriceType.FIXED)
                    .price(120000.0)
                    .isActive(true)
                    .description("Xử lý chuyên sâu các loại áo dạ hội, đính đá mỏng manh.")
                    .build());

            // 3. Giày
            laundryServiceRepository.save(LaundryService.builder()
                    .shop(shop)
                    .name("Vệ sinh Sneaker (Cơ bản)")
                    .category(catGiay)
                    .unit(unitDoi)
                    .priceType(PriceType.FIXED)
                    .price(50000.0)
                    .isActive(true)
                    .description("Vệ sinh giày sneaker bằng dung dịch Crep, khử mùi.")
                    .build());

            laundryServiceRepository.save(LaundryService.builder()
                    .shop(shop)
                    .name("Vệ sinh Giày Da / Tẩy ố vàng")
                    .category(catGiay)
                    .unit(unitDoi)
                    .priceType(PriceType.FIXED)
                    .price(85000.0)
                    .isActive(true)
                    .description("Phục hồi, tẩy ố đế giày, đánh xi giày da cao cấp.")
                    .build());

            // 4. Chăn ga & Gấu bông
            laundryServiceRepository.save(LaundryService.builder()
                    .shop(shop)
                    .name("Giặt sấy Chăn mền (Dưới 3kg)")
                    .category(catGauBong)
                    .unit(unitCai)
                    .priceType(PriceType.FIXED)
                    .price(40000.0)
                    .isActive(true)
                    .description("Giặt và sấy khô mềm mại, lưu hương thơm tho.")
                    .build());

            laundryServiceRepository.save(LaundryService.builder()
                    .shop(shop)
                    .name("Giặt Gấu bông (Size M/L)")
                    .category(catGauBong)
                    .unit(unitCai)
                    .priceType(PriceType.FIXED)
                    .price(65000.0)
                    .isActive(true)
                    .description("Giặt sạch sâu, hút bụi nệm, ướp hương nước hoa nhẹ nhàng.")
                    .build());
        }

        System.out.println("DATA SEEDING COMPLETED FOR ALL SHOPS!");
    }
}