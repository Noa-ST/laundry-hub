package com.laundry.config;

import com.laundry.entity.*;
import com.laundry.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Random;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceUnitRepository serviceUnitRepository;
    private final LaundryServiceRepository laundryServiceRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Fix ratings to 0
        List<Shop> allShops = shopRepository.findAll();
        for(Shop s : allShops) {
            s.setRating(0.0);
            s.setReviewCount(0);
        }
        shopRepository.saveAll(allShops);
        log.info("Reset all shop ratings to 0.");

        // Seed Admin user (sdt: 023456789, mat khau: Nora@2004)
        String adminPhone = "023456789";
        User admin = userRepository.findByPhone(adminPhone).orElse(null);
        if (admin == null) {
            String adminEmail = "admin@laundryhub.com";
            if (userRepository.findByEmail(adminEmail).isPresent()) {
                adminEmail = "admin." + adminPhone + "@laundryhub.com";
            }
            admin = User.builder()
                    .fullName("Quản Trị Viên (Admin)")
                    .email(adminEmail)
                    .phone(adminPhone)
                    .password(passwordEncoder.encode("Nora@2004"))
                    .role(Role.ADMIN)
                    .isActive(true)
                    .avatarUrl("https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff")
                    .build();
            userRepository.save(admin);
            log.info("Admin account seeded successfully.");
        } else {
            admin.setFullName("Quản Trị Viên (Admin)");
            admin.setPassword(passwordEncoder.encode("Nora@2004"));
            admin.setRole(Role.ADMIN);
            admin.setIsActive(true);
            userRepository.save(admin);
            log.info("Admin account updated successfully.");
        }

        if (userRepository.findByEmail("shop1@gmail.com").isPresent()) {
            log.info("Initial shops already seeded.");
            return;
        }

        Random random = new Random();
        String[] shopNames = {"Sạch Sẽ", "Thơm Tho", "Express", "Siêu Tốc", "Tiện Lợi", "Gia Đình", "Chuyên Nghiệp", "Quy Nhơn", "Gia Lai Mới", "24/7", "Sinh Viên", "Hoàn Hảo"};
        String[] streets = {"Lê Hồng Phong", "Nguyễn Thái Học", "Trần Hưng Đạo", "Tây Sơn", "An Dương Vương", "Nguyễn Tất Thành", "Vũ Bảo", "Diên Hồng", "Ngô Mây", "Hoàng Văn Thụ"};

        log.info("Starting shop and service data seeding...");

        for (int i = 1; i <= 40; i++) {
            // 1. Tạo User (Chủ shop)
            String phone = "09" + String.format("%08d", random.nextInt(100000000));
            String email = "shop" + i + "@gmail.com";
            
            User shopOwner = User.builder()
                    .fullName("Chủ Shop " + i)
                    .email(email)
                    .phone(phone)
                    .password(passwordEncoder.encode("123456"))
                    .role(Role.SHOP_OWNER)
                    .isActive(true)
                    .avatarUrl("https://ui-avatars.com/api/?name=Shop+" + i + "&background=random")
                    .build();
            shopOwner = userRepository.save(shopOwner);

            // 2. Tạo Shop
            // Toạ độ khu vực Quy Nhơn (khoảng 13.77, 109.22), dao động một chút để rải rác
            double lat = 13.77 + (random.nextDouble() - 0.5) * 0.05;
            double lng = 109.22 + (random.nextDouble() - 0.5) * 0.05;
            
            String shopName = "Tiệm Giặt Sấy " + shopNames[random.nextInt(shopNames.length)] + " " + i;
            String address = "Số " + (random.nextInt(300) + 1) + " Đường " + streets[random.nextInt(streets.length)] + ", Quy Nhơn, Gia Lai";

            Shop shop = Shop.builder()
                    .owner(shopOwner)
                    .name(shopName)
                    .address(address)
                    .latitude(lat)
                    .longitude(lng)
                    .phone(phone) // Lấy luôn sđt chủ shop
                    .operatingHours("07:00 - 22:00")
                    .totalWashers(random.nextInt(10) + 5)
                    .totalDryers(random.nextInt(10) + 5)
                    .isActive(true)
                    .approvalStatus(com.laundry.enums.ShopApprovalStatus.APPROVED)
                    .rating(4.0 + random.nextDouble()) // 4.0 -> 5.0
                    .reviewCount(random.nextInt(100))
                    .baseShippingFee(15000.0)
                    .extraShippingFeePerKm(5000.0)
                    .maxDeliveryDistance(10.0 + random.nextInt(10))
                    // Ảnh trống hoặc default, bạn bảo tự thêm sau
                    .coverImage("https://res.cloudinary.com/dblw5v3br/image/upload/v1791366792/zeymufohbuqrqtolmkcm.webp")
                    .build();
            shop = shopRepository.save(shop);

            // 3. Tạo Category
            ServiceCategory catGiatsay = serviceCategoryRepository.save(ServiceCategory.builder().name("Giặt sấy cơ bản").displayOrder(1).shop(shop).build());
            ServiceCategory catHap = serviceCategoryRepository.save(ServiceCategory.builder().name("Giặt hấp / Veston").displayOrder(2).shop(shop).build());
            ServiceCategory catGiay = serviceCategoryRepository.save(ServiceCategory.builder().name("Giặt Giày").displayOrder(3).shop(shop).build());
            ServiceCategory catGauBong = serviceCategoryRepository.save(ServiceCategory.builder().name("Giặt Chăn ga & Gấu bông").displayOrder(4).shop(shop).build());

            // 4. Tạo Unit
            ServiceUnit unitKg = serviceUnitRepository.save(ServiceUnit.builder().name("Kg").shop(shop).build());
            ServiceUnit unitCai = serviceUnitRepository.save(ServiceUnit.builder().name("Cái").shop(shop).build());
            ServiceUnit unitDoi = serviceUnitRepository.save(ServiceUnit.builder().name("Đôi").shop(shop).build());
            ServiceUnit unitBo = serviceUnitRepository.save(ServiceUnit.builder().name("Bộ").shop(shop).build());

            // 5. Tạo Services (Làm giá ngẫu nhiên để đa dạng)
            double basePrice1 = 12000.0 + random.nextInt(10) * 1000;
            laundryServiceRepository.save(LaundryService.builder().shop(shop).name("Giặt Sấy Lấy Liền (Quần áo < 3kg)").category(catGiatsay).unit(unitKg).priceType(PriceType.FIXED).price(basePrice1).isActive(true).description("Giặt và sấy khô quần áo hằng ngày, gấp gọn.").build());
            
            double basePrice2 = 20000.0 + random.nextInt(10) * 1000;
            laundryServiceRepository.save(LaundryService.builder().shop(shop).name("Giặt Sấy Quần Áo Dày (Áo khoác, jean)").category(catGiatsay).unit(unitKg).priceType(PriceType.FIXED).price(basePrice2).isActive(true).description("Giặt sấy quần áo jean, kaki, áo khoác len.").build());

            laundryServiceRepository.save(LaundryService.builder().shop(shop).name("Giặt hấp Áo Veston").category(catHap).unit(unitCai).priceType(PriceType.FIXED).price(60000.0 + random.nextInt(3) * 10000).isActive(true).description("Hấp tẩy cao cấp cho Veston.").build());
            laundryServiceRepository.save(LaundryService.builder().shop(shop).name("Vệ sinh Sneaker").category(catGiay).unit(unitDoi).priceType(PriceType.FIXED).price(40000.0 + random.nextInt(2) * 10000).isActive(true).description("Vệ sinh giày sneaker bằng dung dịch chuyên dụng.").build());
            laundryServiceRepository.save(LaundryService.builder().shop(shop).name("Giặt Gấu bông (Size M)").category(catGauBong).unit(unitCai).priceType(PriceType.FIXED).price(50000.0 + random.nextInt(2) * 10000).isActive(true).description("Giặt sạch sâu, ướp hương nước hoa nhẹ nhàng.").build());
        }

        log.info("Data seeding completed for 40 shops.");
    }
}