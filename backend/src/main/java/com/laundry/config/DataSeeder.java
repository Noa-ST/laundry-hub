package com.laundry.config;

import com.laundry.entity.LaundryService;
import com.laundry.entity.Role;
import com.laundry.entity.Shop;
import com.laundry.entity.User;
import com.laundry.repository.LaundryServiceRepository;
import com.laundry.repository.ShopRepository;
import com.laundry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
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

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            log.info("Bắt đầu seeding Mock Users...");
            User customer = User.builder().fullName("Nguyễn Văn Khách").email("khach@laundry.com").phone("0901234567").password("mockpassword").role(Role.CUSTOMER).avatarUrl("https://api.dicebear.com/7.x/avataaars/svg?seed=Khach").build();
            User shopOwner = User.builder().fullName("Trần Thị Chủ Tiệm").email("chu@laundry.com").phone("0912345678").password("mockpassword").role(Role.SHOP_OWNER).avatarUrl("https://api.dicebear.com/7.x/avataaars/svg?seed=Chu").build();
            User admin = User.builder().fullName("Hệ Thống Admin").email("admin@laundry.com").phone("0999999999").password("mockpassword").role(Role.ADMIN).avatarUrl("https://api.dicebear.com/7.x/avataaars/svg?seed=Admin").build();
            userRepository.saveAll(List.of(customer, shopOwner, admin));
            log.info("Seeding Mock Users hoàn tất!");
        }

        if (shopRepository.count() == 0) {
            log.info("Bắt đầu seeding Shops & Services (HCM area)...");
            User shopOwner = userRepository.findByEmail("chu@laundry.com").orElse(null);
            if (shopOwner != null) {
                Shop shop1 = Shop.builder().owner(shopOwner).name("Tiệm Giặt 5 Sao - Quận 10").address("279 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM").latitude(10.762622).longitude(106.660172).isActive(true).build();
                Shop shop2 = Shop.builder().owner(shopOwner).name("Giặt Sấy Express - Phú Nhuận").address("123 Phan Xích Long, Phường 7, Phú Nhuận, TP.HCM").latitude(10.796333).longitude(106.689694).isActive(true).build();
                Shop shop3 = Shop.builder().owner(shopOwner).name("Wash & Go - Quận 1").address("45 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM").latitude(10.781830).longitude(106.699707).isActive(true).build();
                shopRepository.saveAll(List.of(shop1, shop2, shop3));

                LaundryService s1 = LaundryService.builder().shop(shop1).name("Giặt sấy theo kg").unit("kg").price(20000.0).build();
                LaundryService s2 = LaundryService.builder().shop(shop1).name("Giặt chăn mền lớn").unit("cái").price(80000.0).build();
                LaundryService s3 = LaundryService.builder().shop(shop1).name("Giặt hấp áo vest").unit("cái").price(120000.0).build();
                LaundryService s4 = LaundryService.builder().shop(shop2).name("Giặt sấy lấy liền").unit("kg").price(25000.0).build();
                LaundryService s5 = LaundryService.builder().shop(shop2).name("Vệ sinh giày sneaker").unit("đôi").price(60000.0).build();
                LaundryService s6 = LaundryService.builder().shop(shop3).name("Giặt sấy khô cấp tốc").unit("kg").price(30000.0).build();
                LaundryService s7 = LaundryService.builder().shop(shop3).name("Giặt hấp đồ dạ hội").unit("cái").price(200000.0).build();
                laundryServiceRepository.saveAll(List.of(s1, s2, s3, s4, s5, s6, s7));
                log.info("Seeding Shops hoàn tất!");
            }
        }

        // SEEDING QUY NHƠN
        boolean hasQuyNhon = shopRepository.findAll().stream().anyMatch(s -> s.getName().equals("Giặt Sấy Biển Xanh - Quy Nhơn"));
        if (!hasQuyNhon) {
            log.info("Bắt đầu seeding Shops & Services (Quy Nhơn area)...");
            User shopOwner = userRepository.findByEmail("chu@laundry.com").orElse(null);
            if (shopOwner != null) {
                Shop qn1 = Shop.builder().owner(shopOwner).name("Giặt Sấy Biển Xanh - Quy Nhơn").address("45 Ngô Mây, Quy Nhơn, Bình Định").latitude(13.7592).longitude(109.2185).isActive(true).build();
                Shop qn2 = Shop.builder().owner(shopOwner).name("Tiệm Giặt Sinh Viên An Phú").address("120 An Dương Vương, Quy Nhơn, Bình Định").latitude(13.7635).longitude(109.2220).isActive(true).build();
                Shop qn3 = Shop.builder().owner(shopOwner).name("Tiệm Giặt Hấp Quy Nhơn Center").address("88 Lê Duẩn, Quy Nhơn, Bình Định").latitude(13.7745).longitude(109.2280).isActive(true).build();
                shopRepository.saveAll(List.of(qn1, qn2, qn3));

                LaundryService qns1 = LaundryService.builder().shop(qn1).name("Giặt sấy đồ thường").unit("kg").price(18000.0).build();
                LaundryService qns2 = LaundryService.builder().shop(qn1).name("Vệ sinh sneaker").unit("đôi").price(45000.0).build();
                
                LaundryService qns3 = LaundryService.builder().shop(qn2).name("Giặt sấy 2H").unit("kg").price(22000.0).build();
                LaundryService qns4 = LaundryService.builder().shop(qn2).name("Giặt chăn mền lớn").unit("cái").price(65000.0).build();

                LaundryService qns5 = LaundryService.builder().shop(qn3).name("Giặt hấp vest").unit("cái").price(70000.0).build();
                LaundryService qns6 = LaundryService.builder().shop(qn3).name("Giặt áo khoác dạ").unit("cái").price(80000.0).build();
                
                laundryServiceRepository.saveAll(List.of(qns1, qns2, qns3, qns4, qns5, qns6));
                log.info("Seeding Quy Nhơn Shops hoàn tất!");
            }
        }
    }
}
