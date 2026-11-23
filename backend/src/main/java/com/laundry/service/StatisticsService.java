package com.laundry.service;

import com.laundry.dto.response.statistics.StatisticsResponseDTO;
import com.laundry.dto.response.statistics.StatisticsResponseDTO.*;
import com.laundry.entity.Order;
import com.laundry.entity.OrderItem;
import com.laundry.enums.OrderStatus;
import com.laundry.enums.PaymentMethod;
import com.laundry.enums.PaymentStatus;
import com.laundry.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final OrderRepository orderRepository;

    public StatisticsResponseDTO getDashboardStatistics(Long ownerId, String period) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate;
        LocalDateTime endDate = now;

        LocalDateTime prevStartDate;
        LocalDateTime prevEndDate;

        if ("7days".equalsIgnoreCase(period)) {
            startDate = now.minusDays(6).with(LocalTime.MIN);
            prevStartDate = startDate.minusDays(7);
            prevEndDate = startDate.minusNanos(1);
        } else if ("30days".equalsIgnoreCase(period)) {
            startDate = now.minusDays(29).with(LocalTime.MIN);
            prevStartDate = startDate.minusDays(30);
            prevEndDate = startDate.minusNanos(1);
        } else if ("thisMonth".equalsIgnoreCase(period)) {
            startDate = now.withDayOfMonth(1).with(LocalTime.MIN);
            prevStartDate = startDate.minusMonths(1);
            prevEndDate = startDate.minusNanos(1);
        } else if ("thisYear".equalsIgnoreCase(period)) {
            startDate = now.withDayOfYear(1).with(LocalTime.MIN);
            prevStartDate = startDate.minusYears(1);
            prevEndDate = startDate.minusNanos(1);
        } else {
            startDate = now.minusDays(6).with(LocalTime.MIN);
            prevStartDate = startDate.minusDays(7);
            prevEndDate = startDate.minusNanos(1);
        }

        List<Order> currentOrders = orderRepository.findOrdersForStatistics(ownerId, startDate, endDate);
        List<Order> prevOrders = orderRepository.findOrdersForStatistics(ownerId, prevStartDate, prevEndDate);

        // KPI Calculations
        double netRevenue = 0;
        int orderVolume = 0;
        int cancelCount = 0;
        double totalVolumeKg = 0;
        int totalVolumeItems = 0;

        for (Order o : currentOrders) {
            if (o.getStatus() == OrderStatus.COMPLETED && o.getPaymentStatus() == PaymentStatus.PAID) {
                netRevenue += o.getFinalTotalPrice() != null ? o.getFinalTotalPrice().doubleValue() : 0;
                orderVolume++;
            }
            if (o.getStatus() == OrderStatus.CANCELLED) {
                cancelCount++;
            }
            
            if (o.getStatus() == OrderStatus.COMPLETED) {
                for (OrderItem item : o.getItems()) {
                    String unit = item.getService().getUnit() != null ? item.getService().getUnit().getName() : "";
                    if ("kg".equalsIgnoreCase(unit)) {
                        totalVolumeKg += item.getQuantity();
                    } else {
                        totalVolumeItems += item.getQuantity();
                    }
                }
            }
        }

        double prevNetRevenue = 0;
        for (Order o : prevOrders) {
            if (o.getStatus() == OrderStatus.COMPLETED && o.getPaymentStatus() == PaymentStatus.PAID) {
                prevNetRevenue += o.getFinalTotalPrice() != null ? o.getFinalTotalPrice().doubleValue() : 0;
            }
        }

        double revenueChangePercent = 0;
        if (prevNetRevenue > 0) {
            revenueChangePercent = ((netRevenue - prevNetRevenue) / prevNetRevenue) * 100;
        } else if (netRevenue > 0) {
            revenueChangePercent = 100; // 100% increase if prev was 0 and now is > 0
        }

        double cancelRate = currentOrders.isEmpty() ? 0 : ((double) cancelCount / currentOrders.size()) * 100;
        double averageOrderValue = orderVolume == 0 ? 0 : netRevenue / orderVolume;

        KpiCardsDTO kpis = new KpiCardsDTO(
                Math.round(netRevenue),
                Math.round(revenueChangePercent * 10.0) / 10.0,
                orderVolume,
                cancelCount,
                Math.round(cancelRate * 10.0) / 10.0,
                Math.round(averageOrderValue),
                Math.round(totalVolumeKg * 10.0) / 10.0,
                totalVolumeItems
        );

        // Revenue Trend
        Map<String, Double> trendMap = new LinkedHashMap<>();
        Map<String, Integer> trendCountMap = new LinkedHashMap<>();
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("dd/MM");
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MM/yyyy");

        boolean isYearly = "thisYear".equalsIgnoreCase(period);
        
        // Initialize empty buckets
        if (isYearly) {
            LocalDate temp = startDate.toLocalDate();
            while (!temp.isAfter(endDate.toLocalDate())) {
                String key = temp.format(monthFormatter);
                trendMap.put(key, 0.0);
                trendCountMap.put(key, 0);
                temp = temp.plusMonths(1);
            }
        } else {
            LocalDate temp = startDate.toLocalDate();
            while (!temp.isAfter(endDate.toLocalDate())) {
                String key = temp.format(dayFormatter);
                trendMap.put(key, 0.0);
                trendCountMap.put(key, 0);
                temp = temp.plusDays(1);
            }
        }

        for (Order o : currentOrders) {
            if (o.getStatus() == OrderStatus.COMPLETED && o.getPaymentStatus() == PaymentStatus.PAID) {
                String label = isYearly ? o.getCreatedAt().format(monthFormatter) : o.getCreatedAt().format(dayFormatter);
                double val = o.getFinalTotalPrice() != null ? o.getFinalTotalPrice().doubleValue() : 0;
                trendMap.put(label, trendMap.getOrDefault(label, 0.0) + val);
                trendCountMap.put(label, trendCountMap.getOrDefault(label, 0) + 1);
            }
        }

        List<RevenuePointDTO> trend = trendMap.entrySet().stream()
                .map(e -> new RevenuePointDTO(e.getKey(), e.getValue(), trendCountMap.getOrDefault(e.getKey(), 0)))
                .collect(Collectors.toList());

        // Top Services & Categories
        Map<String, Double> serviceRevMap = new HashMap<>();
        Map<String, Integer> serviceQtyMap = new HashMap<>();
        Map<String, Double> categoryRevMap = new HashMap<>();

        for (Order o : currentOrders) {
            if (o.getStatus() == OrderStatus.COMPLETED && o.getPaymentStatus() == PaymentStatus.PAID) {
                for (OrderItem item : o.getItems()) {
                    String sName = item.getService().getName();
                    String cName = item.getService().getCategory() != null ? item.getService().getCategory().getName() : "Khác";
                    double rev = (item.getPriceAtBooking() != null ? item.getPriceAtBooking().doubleValue() : 0) * item.getQuantity();

                    serviceRevMap.put(sName, serviceRevMap.getOrDefault(sName, 0.0) + rev);
                    serviceQtyMap.put(sName, serviceQtyMap.getOrDefault(sName, 0) + item.getQuantity().intValue());
                    categoryRevMap.put(cName, categoryRevMap.getOrDefault(cName, 0.0) + rev);
                }
            }
        }

        List<TopServiceDTO> topServices = serviceRevMap.entrySet().stream()
                .map(e -> new TopServiceDTO(e.getKey(), e.getValue(), serviceQtyMap.get(e.getKey())))
                .sorted((a, b) -> Double.compare(b.revenue(), a.revenue()))
                .limit(5)
                .collect(Collectors.toList());

        List<CategoryRevenueDTO> categoryRevenue = categoryRevMap.entrySet().stream()
                .map(e -> new CategoryRevenueDTO(e.getKey(), e.getValue()))
                .sorted((a, b) -> Double.compare(b.revenue(), a.revenue()))
                .collect(Collectors.toList());

        // Operational Breakdown
        int customerDropOff = 0, shopPickUp = 0;
        int customerPickUp = 0, shopDelivery = 0;
        int cash = 0, vietQr = 0;
        double cashRevenue = 0, vietQrRevenue = 0;

        for (Order o : currentOrders) {
            if (o.getInboundType() != null) {
                if (o.getInboundType().name().equals("CUSTOMER_DROP_OFF")) customerDropOff++;
                if (o.getInboundType().name().equals("SHOP_PICK_UP")) shopPickUp++;
            }
            if (o.getOutboundType() != null) {
                if (o.getOutboundType().name().equals("CUSTOMER_PICK_UP")) customerPickUp++;
                if (o.getOutboundType().name().equals("SHOP_DELIVERY")) shopDelivery++;
            }
            if (o.getPaymentMethod() != null) {
                boolean isCash = o.getPaymentMethod() == PaymentMethod.COD || "CASH".equalsIgnoreCase(o.getPaymentMethod().name());
                boolean isVietQr = o.getPaymentMethod() == PaymentMethod.VIETQR;
                double val = o.getFinalTotalPrice() != null ? o.getFinalTotalPrice().doubleValue() : 0;

                if (isCash) {
                    cash++;
                    if (o.getStatus() == OrderStatus.COMPLETED && o.getPaymentStatus() == PaymentStatus.PAID) {
                        cashRevenue += val;
                    }
                } else if (isVietQr) {
                    vietQr++;
                    if (o.getStatus() == OrderStatus.COMPLETED && o.getPaymentStatus() == PaymentStatus.PAID) {
                        vietQrRevenue += val;
                    }
                }
            }
        }

        int pos = 0, app = 0;
        for (Order o : currentOrders) {
            String customerName = o.getCustomer() != null ? o.getCustomer().getFullName() : null;
            if (o.getCustomer() == null || (o.getReceiverName() != null && !o.getReceiverName().trim().isEmpty() && !o.getReceiverName().equals(customerName))) {
                pos++;
            } else {
                app++;
            }
        }

        OperationalBreakdownDTO breakdown = new OperationalBreakdownDTO(
                new OperationalBreakdownDTO.ChannelBreakdown(app, pos),
                new OperationalBreakdownDTO.DeliveryBreakdown(customerDropOff, shopPickUp, customerPickUp, shopDelivery),
                new OperationalBreakdownDTO.PaymentBreakdown(cash, vietQr, cashRevenue, vietQrRevenue)
        );

        return new StatisticsResponseDTO(kpis, trend, topServices, categoryRevenue, breakdown);
    }
}
