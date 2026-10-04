package com.laundry.config;

import com.laundry.entity.LaundryService;
import com.laundry.entity.PriceType;
import com.laundry.entity.Role;
import com.laundry.entity.ServiceCategory;
import com.laundry.entity.ServiceUnit;
import com.laundry.entity.Shop;
import com.laundry.entity.User;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.ServiceCategoryRepository;
import com.laundry.repository.ServiceUnitRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final LaundryServiceRepository laundryServiceRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceUnitRepository serviceUnitRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (shopRepository.count() > 0) {
            log.info("Database already seeded with shops.");
            return;
        }

        log.info("Bắt đầu khởi tạo dữ liệu mẫu (Seeding Data)...");

        // Shop 1: Giặt Sấy 24/7 (Phổ thông, giá rẻ, gần trung tâm)
        User owner1 = createUser("0901000001", "Chủ tiệm Giặt Sấy 24/7");
        Shop shop1 = createShop(owner1, "Giặt Sấy Tiện Lợi 24/7", "123 Nguyễn Trãi, Q.1, TP.HCM", 10.7700, 106.7000, "0901000001", "07:00 - 22:00", 5, 5);
        seedServicesForShop1(shop1);

        // Shop 2: Giặt Hấp Cao Cấp (Chuyên đồ đắt tiền, giá liên hệ)
        User owner2 = createUser("0902000002", "Chủ tiệm Giặt Hấp Cao Cấp");
        Shop shop2 = createShop(owner2, "Premium Laundry & Dry Cleaning", "456 Lê Lợi, Q.1, TP.HCM", 10.7750, 106.7020, "0902000002", "08:00 - 20:00", 2, 2);
        seedServicesForShop2(shop2);

        // Shop 3: Giặt Sinh Viên (Xa trung tâm, giá rất rẻ)
        User owner3 = createUser("0903000003", "Chủ tiệm Giặt Sinh Viên");
        Shop shop3 = createShop(owner3, "Tiệm Giặt Sinh Viên Làng Đại Học", "789 Kha Vạn Cân, Thủ Đức, TP.HCM", 10.8500, 106.7500, "0903000003", "06:00 - 23:00", 10, 8);
        seedServicesForShop3(shop3);
        
        // Shop 4: Vệ sinh Giày & Túi Xách (Chuyên biệt)
        User owner4 = createUser("0904000004", "Chủ tiệm Sneaker Care");
        Shop shop4 = createShop(owner4, "Sneaker Spa & Bag Care", "321 Sư Vạn Hạnh, Q.10, TP.HCM", 10.7710, 106.6680, "0904000004", "09:00 - 21:00", 1, 1);
        seedServicesForShop4(shop4);

        log.info("✅ Khởi tạo dữ liệu mẫu thành công! Đã tạo 4 tiệm giặt với các dịch vụ đa dạng.");
    }

    private User createUser(String phone, String fullName) {
        return userRepository.save(User.builder()
                .phone(phone)
                .password(passwordEncoder.encode("123456"))
                .role(Role.SHOP_OWNER)
                .fullName(fullName)
                .build());
    }

    private Shop createShop(User owner, String name, String address, Double lat, Double lng, String phone, String hours, int washers, int dryers) {
        return shopRepository.save(Shop.builder()
                .owner(owner)
                .name(name)
                .address(address)
                .latitude(lat)
                .longitude(lng)
                .phone(phone)
                .operatingHours(hours)
                .totalWashers(washers)
                .totalDryers(dryers)
                .isActive(true)
                .build());
    }

    private void seedServicesForShop1(Shop shop) {
        ServiceCategory catBasic = serviceCategoryRepository.save(ServiceCategory.builder().name("Giặt sấy cơ bản").shop(shop).displayOrder(1).build());
        ServiceCategory catCombo = serviceCategoryRepository.save(ServiceCategory.builder().name("Combo Giặt + Sấy + Xếp").shop(shop).displayOrder(2).build());
        
        ServiceUnit uKg = serviceUnitRepository.save(ServiceUnit.builder().name("Kg").shop(shop).isDefault(true).build());
        ServiceUnit uCai = serviceUnitRepository.save(ServiceUnit.builder().name("Cái").shop(shop).isDefault(false).build());

        laundryServiceRepository.saveAll(List.of(
                createSvc(shop, catBasic, uKg, "Giặt ướt (chưa sấy)", 15000.0, PriceType.FIXED, 30000.0, "Giặt máy thường, vắt khô"),
                createSvc(shop, catBasic, uKg, "Sấy khô", 15000.0, PriceType.FIXED, 30000.0, "Sấy khô 100%"),
                createSvc(shop, catCombo, uKg, "Combo Giặt Sấy Lấy Liền", 25000.0, PriceType.FIXED, 50000.0, "Giặt, sấy và xếp gọn gàng"),
                createSvc(shop, catCombo, uCai, "Giặt chăn mền vừa", 40000.0, PriceType.FIXED, 0.0, "Chăn màn <3kg")
        ));
    }

    private void seedServicesForShop2(Shop shop) {
        ServiceCategory catPremium = serviceCategoryRepository.save(ServiceCategory.builder().name("Giặt Hấp / Dry Cleaning").shop(shop).displayOrder(1).build());
        ServiceCategory catHome = serviceCategoryRepository.save(ServiceCategory.builder().name("Vệ sinh Sofa / Rèm").shop(shop).displayOrder(2).build());
        
        ServiceUnit uBo = serviceUnitRepository.save(ServiceUnit.builder().name("Bộ").shop(shop).isDefault(true).build());
        ServiceUnit uCai = serviceUnitRepository.save(ServiceUnit.builder().name("Cái").shop(shop).isDefault(false).build());
        ServiceUnit uMet = serviceUnitRepository.save(ServiceUnit.builder().name("Mét").shop(shop).isDefault(false).build());

        laundryServiceRepository.saveAll(List.of(
                createSvc(shop, catPremium, uBo, "Giặt hấp Veston / Suit", 120000.0, PriceType.FIXED, 0.0, "Phục hồi phom dáng, tẩy ố chuyên sâu"),
                createSvc(shop, catPremium, uCai, "Giặt hấp Áo cưới / Đồ dạ hội", 0.0, PriceType.CONTACT, 0.0, "Báo giá sau khi kiểm tra chất liệu vải"),
                createSvc(shop, catPremium, uCai, "Giặt áo lông / Đồ hiệu", 0.0, PriceType.CONTACT, 0.0, "Giá tùy thuộc vào tình trạng"),
                createSvc(shop, catHome, uMet, "Vệ sinh rèm cửa cao cấp", 80000.0, PriceType.FIXED, 0.0, "Giặt rèm tại nhà hoặc mang về")
        ));
    }

    private void seedServicesForShop3(Shop shop) {
        ServiceCategory catSv = serviceCategoryRepository.save(ServiceCategory.builder().name("Sinh viên siêu tiết kiệm").shop(shop).displayOrder(1).build());
        ServiceUnit uKg = serviceUnitRepository.save(ServiceUnit.builder().name("Kg").shop(shop).isDefault(true).build());
        
        laundryServiceRepository.saveAll(List.of(
                createSvc(shop, catSv, uKg, "Giặt sấy quần áo thường", 12000.0, PriceType.FIXED, 24000.0, "Phơi nắng tự nhiên hoặc sấy"),
                createSvc(shop, catSv, uKg, "Giặt mền mùng sinh viên", 15000.0, PriceType.FIXED, 30000.0, "Giặt sạch thơm")
        ));
    }

    private void seedServicesForShop4(Shop shop) {
        ServiceCategory catShoe = serviceCategoryRepository.save(ServiceCategory.builder().name("Vệ sinh Giày").shop(shop).displayOrder(1).build());
        ServiceCategory catBag = serviceCategoryRepository.save(ServiceCategory.builder().name("Phục hồi Túi xách").shop(shop).displayOrder(2).build());
        
        ServiceUnit uDoi = serviceUnitRepository.save(ServiceUnit.builder().name("Đôi").shop(shop).isDefault(true).build());
        ServiceUnit uCai = serviceUnitRepository.save(ServiceUnit.builder().name("Cái").shop(shop).isDefault(false).build());

        laundryServiceRepository.saveAll(List.of(
                createSvc(shop, catShoe, uDoi, "Vệ sinh Sneaker cơ bản", 60000.0, PriceType.FIXED, 0.0, "Vệ sinh ngoài và khử mùi"),
                createSvc(shop, catShoe, uDoi, "Phục hồi đế / Custom giày", 0.0, PriceType.CONTACT, 0.0, "Báo giá theo tình trạng thực tế"),
                createSvc(shop, catBag, uCai, "Spa Túi xách Da thật", 0.0, PriceType.CONTACT, 0.0, "Làm sạch, dưỡng da, phục hồi màu")
        ));
    }

    private LaundryService createSvc(Shop shop, ServiceCategory cat, ServiceUnit unit, String name, Double price, PriceType type, Double minCharge, String desc) {
        return LaundryService.builder()
                .shop(shop)
                .category(cat)
                .unit(unit)
                .name(name)
                .price(type == PriceType.FIXED ? price : null)
                .priceType(type)
                .minCharge(minCharge > 0 ? minCharge : null)
                .description(desc)
                .isActive(true)
                .build();
    }
}